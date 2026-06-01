import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  AudioRecordingService,
  MAX_RECORDING_DURATION_MS,
  getSupportedMimeType,
} from "@/lib/audio-recording";

describe("getSupportedMimeType", () => {
  it("returns null when MediaRecorder is not defined", () => {
    const original = globalThis.MediaRecorder;
    // @ts-expect-error - testing absence
    delete globalThis.MediaRecorder;
    expect(getSupportedMimeType()).toBeNull();
    globalThis.MediaRecorder = original;
  });

  it("returns a supported mime type when MediaRecorder exists", () => {
    const original = globalThis.MediaRecorder;
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === "audio/webm",
    } as unknown as typeof MediaRecorder;
    expect(getSupportedMimeType()).toBe("audio/webm");
    globalThis.MediaRecorder = original;
  });
});

describe("AudioRecordingService", () => {
  let mockStream: MediaStream;
  let mockRecorderInstance: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    state: string;
    ondataavailable: ((event: { data: Blob }) => void) | null;
    onstop: (() => void) | null;
    onerror: (() => void) | null;
    stream: MediaStream;
  };

  beforeEach(() => {
    mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;

    mockRecorderInstance = {
      start: vi.fn(),
      stop: vi.fn(),
      state: "inactive",
      ondataavailable: null,
      onstop: null,
      onerror: null,
      stream: mockStream,
    };

    // Use a class so `new MediaRecorder(...)` works properly
    class MockMediaRecorder {
      start = (...args: unknown[]) => {
        this.state = "recording";
        mockRecorderInstance.state = "recording";
        (mockRecorderInstance.start as (...a: unknown[]) => void)(...args);
      };
      stop = () => {
        this.state = "inactive";
        mockRecorderInstance.state = "inactive";
        (mockRecorderInstance.stop as () => void)();
        if (mockRecorderInstance.onstop) mockRecorderInstance.onstop();
      };
      state = "inactive";
      stream = mockStream;
      set ondataavailable(cb: ((event: { data: Blob }) => void) | null) {
        mockRecorderInstance.ondataavailable = cb;
      }
      set onstop(cb: (() => void) | null) {
        mockRecorderInstance.onstop = cb;
      }
      set onerror(cb: (() => void) | null) {
        mockRecorderInstance.onerror = cb;
      }
      static isTypeSupported() {
        return true;
      }
    }

    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("has a 3-minute max duration constant", () => {
    expect(MAX_RECORDING_DURATION_MS).toBe(180000);
  });

  it("starts recording and changes state", async () => {
    const service = new AudioRecordingService("audio/webm");
    const states: string[] = [];
    service.setOnStateChange((s) => states.push(s));

    await service.start();
    expect(mockRecorderInstance.start).toHaveBeenCalledWith(1000);
    expect(states).toContain("recording");
  });

  it("stops recording and produces a blob", async () => {
    const service = new AudioRecordingService("audio/webm");
    const results: { blob: Blob; mimeType: string }[] = [];
    service.setOnComplete((r) => results.push(r));

    await service.start();

    // Simulate data chunk
    mockRecorderInstance.ondataavailable?.({ data: new Blob(["audio-data"], { type: "audio/webm" }) });
    service.stop();

    expect(results).toHaveLength(1);
    expect(results[0].mimeType).toBe("audio/webm");
  });

  it("auto-stops at max duration", async () => {
    vi.useFakeTimers();
    const service = new AudioRecordingService("audio/webm");

    // Need to flush the promise queue for getUserMedia
    const startPromise = service.start();
    await vi.advanceTimersByTimeAsync(0); // flush microtasks
    await startPromise;

    await vi.advanceTimersByTimeAsync(MAX_RECORDING_DURATION_MS);

    expect(mockRecorderInstance.stop).toHaveBeenCalled();
  });

  it("reports errors when getUserMedia fails", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    const service = new AudioRecordingService("audio/webm");
    const errors: Error[] = [];
    service.setOnError((e) => errors.push(e));

    await service.start();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Permission denied");
  });
});
