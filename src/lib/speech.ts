export interface SpeechProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  onTranscript(callback: (text: string) => void): void;
  onError(callback: (error: Error) => void): void;
}

type RecognitionAlternative = {
  transcript: string;
};

type RecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export class WebSpeechProvider implements SpeechProvider {
  private recognition: BrowserSpeechRecognition;
  private transcriptCallback: (text: string) => void = () => undefined;
  private errorCallback: (error: Error) => void = () => undefined;
  private finalTranscript = "";

  constructor() {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      throw new Error("Speech recognition is not supported on this device.");
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const chunk = Array.from({ length: result.length }, (_, alternativeIndex) => result[alternativeIndex]?.transcript ?? "")
          .join(" ")
          .trim();

        if (!chunk) {
          continue;
        }

        if (result.isFinal) {
          this.finalTranscript = `${this.finalTranscript} ${chunk}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${chunk}`.trim();
        }
      }

      this.transcriptCallback(`${this.finalTranscript} ${interimTranscript}`.trim());
    };
    this.recognition.onerror = (event) => {
      this.errorCallback(new Error(event.error ?? "Speech recognition failed."));
    };
  }

  onTranscript(callback: (text: string) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  async start(): Promise<void> {
    this.finalTranscript = "";
    this.recognition.start();
  }

  async stop(): Promise<void> {
    this.recognition.stop();
  }
}

export function createSpeechProvider(): SpeechProvider | null {
  if (!getSpeechRecognitionConstructor()) {
    return null;
  }

  return new WebSpeechProvider();
}
