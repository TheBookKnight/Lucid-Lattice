import type { TranscriberInput, TranscriberMessage } from "@/workers/transcriber.worker";

export interface SpeechProvider {
  isAvailable(): Promise<boolean>;
  transcribe(
    audio: Blob,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string>;
}

/**
 * Convert an audio Blob to mono Float32 PCM at 16 kHz suitable for Whisper.
 *
 * We use OfflineAudioContext at 16 kHz to let the browser handle resampling.
 * The recorded MIME type order in audio-recording.ts prefers audio/webm then
 * audio/mp4 — both are decodable by AudioContext in Chrome and Safari
 * respectively, ensuring cross-browser compatibility.
 */
export async function blobToFloat32Audio(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode with a temporary AudioContext (uses device sample rate)
  const tempCtx = new AudioContext();
  const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  await tempCtx.close();

  // Resample to mono 16 kHz via OfflineAudioContext
  const numFrames = Math.ceil(decoded.duration * 16000);
  const offlineCtx = new OfflineAudioContext(1, numFrames, 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0);
}

export class WhisperTinyProvider implements SpeechProvider {
  private worker: Worker | null = null;

  async isAvailable(): Promise<boolean> {
    // Available in browsers that support Web Workers and AudioContext
    if (typeof window === "undefined") return false;
    return typeof Worker !== "undefined" && typeof AudioContext !== "undefined";
  }

  async transcribe(
    audio: Blob,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    const pcm = await blobToFloat32Audio(audio);

    return new Promise<string>((resolve, reject) => {
      // Instantiate worker using Next.js-compatible URL pattern
      this.worker = new Worker(
        new URL("../workers/transcriber.worker.ts", import.meta.url),
        { type: "module" },
      );

      this.worker.onmessage = (event: MessageEvent<TranscriberMessage>) => {
        const msg = event.data;
        switch (msg.type) {
          case "progress":
            onProgress?.(msg.progress, msg.message);
            break;
          case "success":
            resolve(msg.text);
            this.worker?.terminate();
            this.worker = null;
            break;
          case "error":
            reject(new Error(msg.error));
            this.worker?.terminate();
            this.worker = null;
            break;
        }
      };

      this.worker.onerror = (err) => {
        reject(new Error(err.message || "Worker startup failed"));
        this.worker?.terminate();
        this.worker = null;
      };

      const message: TranscriberInput = { type: "transcribe", audio: pcm };
      this.worker.postMessage(message, [pcm.buffer]);
    });
  }
}

/**
 * Select the appropriate speech provider for recorded blob transcription.
 * Uses WhisperTinyProvider which runs locally via Web Worker.
 * NativeSpeechProvider was removed — the Web Speech API cannot transcribe
 * pre-recorded blobs, only live microphone input.
 */
export async function selectSpeechProvider(): Promise<SpeechProvider | null> {
  const whisper = new WhisperTinyProvider();
  if (await whisper.isAvailable()) return whisper;
  return null;
}
