// Note: transcriber.worker is kept for reference but no longer used by CloudflareAIProvider.

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

export class CloudflareAIProvider implements SpeechProvider {
  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return typeof window.fetch !== "undefined";
  }

  async transcribe(
    audio: Blob,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    onProgress?.(10, "Sending audio…");

    // Cloudflare AI Whisper expects encoded audio file bytes (WebM, MP4, WAV, etc.)
    // — NOT raw PCM floats. Send the Blob's bytes directly; Cloudflare decodes it.
    const audioBuffer = await audio.arrayBuffer();

    onProgress?.(30, "Transcribing…");

    let response: Response;
    try {
      response = await fetch("/api/transcribe", {
        method: "POST",
        // Use the blob's actual MIME type so the server can pass it along.
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audioBuffer,
      });
    } catch {
      // Network failure (offline, DNS failure, etc.)
      throw new OfflineError();
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error((body as { error?: string }).error ?? "Transcription failed.");
    }

    onProgress?.(90, "Finishing…");
    const data = (await response.json()) as { text: string };
    onProgress?.(100, "Done");
    return data.text ?? "";
  }
}

/** Thrown when transcription fails because the device is offline. */
export class OfflineError extends Error {
  constructor() {
    super("No internet connection. Connect to WiFi and tap Transcribe to try again.");
    this.name = "OfflineError";
  }
}

/**
 * Select the appropriate speech provider for recorded blob transcription.
 * Uses CloudflareAIProvider which runs Whisper server-side on Cloudflare's GPU.
 * Requires an internet connection; throws OfflineError when offline.
 */
export async function selectSpeechProvider(): Promise<SpeechProvider | null> {
  const provider = new CloudflareAIProvider();
  if (await provider.isAvailable()) return provider;
  return null;
}

