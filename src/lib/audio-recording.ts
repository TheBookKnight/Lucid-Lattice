export const MAX_RECORDING_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export type RecordingState = "idle" | "recording" | "stopped";

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  duration: number;
}

export function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private startTime = 0;
  private mimeType: string;

  private onStateChange: (state: RecordingState) => void = () => undefined;
  private onTimeUpdate: (elapsedMs: number) => void = () => undefined;
  private onComplete: (result: RecordingResult) => void = () => undefined;
  private onError: (error: Error) => void = () => undefined;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(mimeType?: string) {
    this.mimeType = mimeType ?? getSupportedMimeType() ?? "audio/webm";
  }

  setOnStateChange(cb: (state: RecordingState) => void): void {
    this.onStateChange = cb;
  }

  setOnTimeUpdate(cb: (elapsedMs: number) => void): void {
    this.onTimeUpdate = cb;
  }

  setOnComplete(cb: (result: RecordingResult) => void): void {
    this.onComplete = cb;
  }

  setOnError(cb: (error: Error) => void): void {
    this.onError = cb;
  }

  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        const duration = Date.now() - this.startTime;
        this.cleanup();
        this.onStateChange("stopped");
        this.onComplete({ blob, mimeType: this.mimeType, duration });
      };

      this.mediaRecorder.onerror = () => {
        this.cleanup();
        this.onStateChange("stopped");
        this.onError(new Error("Recording failed."));
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(1000); // collect data every second
      this.onStateChange("recording");

      // Time update interval
      this.intervalId = setInterval(() => {
        this.onTimeUpdate(Date.now() - this.startTime);
      }, 500);

      // Auto-stop at max duration
      this.timeoutId = setTimeout(() => {
        this.stop();
      }, MAX_RECORDING_DURATION_MS);
    } catch (err) {
      this.onError(
        err instanceof Error ? err : new Error("Could not access microphone."),
      );
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      // Stop all tracks
      for (const track of this.mediaRecorder.stream.getTracks()) {
        track.stop();
      }
    }
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }
}
