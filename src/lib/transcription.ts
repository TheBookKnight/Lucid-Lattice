export interface SpeechProvider {
  isAvailable(): Promise<boolean>;
  transcribe(audio: Blob): Promise<string>;
}

export class NativeSpeechProvider implements SpeechProvider {
  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  async transcribe(_audio: Blob): Promise<string> {
    // The native Web Speech API works via live streaming (SpeechRecognition),
    // not via post-hoc file transcription. For "Generate Transcript" from
    // a recorded blob, we use the real-time capture already in use-speech-capture.
    // This provider is used for capability detection and live transcription.
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionCtor) {
      throw new Error("Speech recognition is not supported on this device.");
    }

    return new Promise<string>((resolve, reject) => {
      const recognition = new SpeechRecognitionCtor();
      let result = "";

      // Attempt local-only when supported
      try {
        (recognition as unknown as Record<string, boolean>).localOnly = true;
      } catch {
        // localOnly not supported, continue
      }

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res[0]) {
            result += res[0].transcript + " ";
          }
        }
      };

      recognition.onend = () => resolve(result.trim());
      recognition.onerror = (event) =>
        reject(new Error(event.error ?? "Speech recognition failed."));

      recognition.start();
    });
  }
}

export class WhisperTinyProvider implements SpeechProvider {
  async isAvailable(): Promise<boolean> {
    // Whisper Tiny model download not yet implemented
    return false;
  }

  async transcribe(_audio: Blob): Promise<string> {
    throw new Error("Not implemented");
  }
}

export async function selectSpeechProvider(): Promise<SpeechProvider | null> {
  const native = new NativeSpeechProvider();
  if (await native.isAvailable()) return native;

  const whisper = new WhisperTinyProvider();
  if (await whisper.isAvailable()) return whisper;

  return null;
}
