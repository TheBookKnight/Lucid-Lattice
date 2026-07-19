import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted() runs before vi.mock() factories, making MockOfflineError
// available inside the factory. This avoids the temporal dead zone that
// would occur with a plain `class` declaration at module scope.
const { MockOfflineError } = vi.hoisted(() => {
  class MockOfflineError extends Error {
    constructor() {
      super("No internet connection. Connect to WiFi and tap Transcribe to try again.");
      this.name = "OfflineError";
    }
  }
  return { MockOfflineError };
});

// Mock db
const mockSaveAudioBlob = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/db", () => ({
  getAudioBlob: vi.fn().mockResolvedValue(null),
  saveAudioBlob: (...args: unknown[]) => mockSaveAudioBlob(...args),
  deleteAudioBlob: vi.fn().mockResolvedValue(undefined),
}));

// Mock transcription — selectSpeechProvider returns a mock provider whose
// transcribe() is controlled by `mockTranscribe`. OfflineError is the same
// class reference used by the component so instanceof checks work correctly.
const mockTranscribe = vi.fn();
vi.mock("@/lib/transcription", () => ({
  selectSpeechProvider: vi.fn().mockResolvedValue({
    transcribe: (...args: unknown[]) => mockTranscribe(...args),
  }),
  OfflineError: MockOfflineError,
}));

// Mock AudioRecordingService to simulate recording completion
const mockStart = vi.fn();
const mockStop = vi.fn();
let capturedOnComplete: ((result: { blob: Blob; mimeType: string; duration: number }) => void) | null = null;

vi.mock("@/lib/audio-recording", () => ({
  MAX_RECORDING_DURATION_MS: 180000,
  AudioRecordingService: class MockAudioRecordingService {
    setOnStateChange(cb: (state: string) => void) { cb("recording"); }
    setOnTimeUpdate() {}
    setOnComplete(cb: (result: { blob: Blob; mimeType: string; duration: number }) => void) {
      capturedOnComplete = cb;
    }
    setOnError() {}
    start() { return mockStart(); }
    stop() { return mockStop(); }
  },
}));

import { AudioRecorder } from "@/components/audio-recorder";
// Import OfflineError from the mocked module so tests can throw it.
// This is the same class reference the component uses for instanceof checks.
import { OfflineError } from "@/lib/transcription";

afterEach(() => {
  cleanup();
  mockTranscribe.mockReset();
  mockSaveAudioBlob.mockReset();
  capturedOnComplete = null;
});

describe("AudioRecorder", () => {
  it("renders Start Recording button when no audio exists", () => {
    render(
      <AudioRecorder
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /start recording/i })).toBeTruthy();
  });

  it("does not render Transcribe button when there is no recording", () => {
    render(
      <AudioRecorder
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /transcribe/i })).toBeNull();
  });

  it("shows Transcribe button when audio URL exists", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy();
    });
  });

  it("Transcribe button is enabled when recording exists and not transcribing", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /transcribe/i });
      expect(btn).not.toBeDisabled();
    });
  });

  it("calls onTranscriptReady when manual transcription succeeds", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    mockTranscribe.mockResolvedValueOnce("Hello world");

    const onTranscriptReady = vi.fn();
    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={onTranscriptReady}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      expect(onTranscriptReady).toHaveBeenCalledWith("Hello world");
    });
  });

  it("shows error when transcription fails", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    mockTranscribe.mockRejectedValueOnce(new Error("Model load failed"));

    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      expect(screen.getByText("Model load failed")).toBeTruthy();
    });
  });

  it("Delete button removes recording and disables Transcribe", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    const onAudioDeleted = vi.fn();
    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={onAudioDeleted}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(onAudioDeleted).toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: /transcribe/i })).toBeNull();
    });
  });

  it("auto-transcribes after a fresh recording completes", async () => {
    mockTranscribe.mockResolvedValueOnce("Auto transcribed text");
    mockSaveAudioBlob.mockResolvedValue(undefined);

    const onTranscriptReady = vi.fn();
    const onAudioSaved = vi.fn();

    render(
      <AudioRecorder
        onAudioSaved={onAudioSaved}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={onTranscriptReady}
      />,
    );

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));

    // Simulate recording completion
    await act(async () => {
      capturedOnComplete?.({
        blob: new Blob(["fresh-audio"], { type: "audio/webm" }),
        mimeType: "audio/webm",
        duration: 5000,
      });
    });

    // Allow setTimeout(0) to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await waitFor(() => {
      expect(mockTranscribe).toHaveBeenCalled();
      expect(onTranscriptReady).toHaveBeenCalledWith("Auto transcribed text");
    });
  });

  it("does NOT auto-transcribe when loading an existing recording from IndexedDB", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["stored-audio"], { type: "audio/webm" }),
    });

    render(
      <AudioRecorder
        audioBlobId="existing-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy();
    });

    // Allow any microtasks to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Transcribe should NOT have been called automatically
    expect(mockTranscribe).not.toHaveBeenCalled();
  });

  it("surfaces model-load failure with a clear message", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    mockTranscribe.mockRejectedValueOnce(
      new Error("Model load failed: session creation error"),
    );

    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Model load failed: session creation error"),
      ).toBeTruthy();
    });
  });

  // ─── Scenario 2: no WiFi — shows amber offline prompt ─────────────────────
  it("shows the offline WiFi prompt when transcription fails due to no internet", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    // Simulate the provider throwing OfflineError (network unavailable).
    mockTranscribe.mockRejectedValueOnce(new OfflineError());

    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      // Amber offline prompt should appear.
      expect(screen.getByText(/no internet connection/i)).toBeTruthy();
      // Generic red error must NOT appear.
      expect(screen.queryByText(/model load failed/i)).toBeNull();
    });
  });

  it("does NOT call onTranscriptReady when the offline prompt is shown", async () => {
    const { getAudioBlob } = await import("@/lib/db");
    (getAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    mockTranscribe.mockRejectedValueOnce(new OfflineError());

    const onTranscriptReady = vi.fn();
    render(
      <AudioRecorder
        audioBlobId="test-id"
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={onTranscriptReady}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() =>
      expect(screen.getByText(/no internet connection/i)).toBeTruthy(),
    );

    expect(onTranscriptReady).not.toHaveBeenCalled();
  });

  // ─── Scenario 3: recorded offline → back online → retry succeeds ──────────
  it("auto-transcribe fails offline, then manual Transcribe succeeds when WiFi returns", async () => {
    // Step 1 — fresh recording completes while offline; auto-transcribe throws OfflineError.
    mockTranscribe.mockRejectedValueOnce(new OfflineError());
    mockSaveAudioBlob.mockResolvedValue(undefined);

    const onTranscriptReady = vi.fn();
    render(
      <AudioRecorder
        onAudioSaved={vi.fn()}
        onAudioDeleted={vi.fn()}
        onTranscriptReady={onTranscriptReady}
      />,
    );

    // Trigger recording and simulate completion (fires auto-transcribe → OfflineError).
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    await act(async () => {
      capturedOnComplete?.({
        blob: new Blob(["audio"], { type: "audio/webm" }),
        mimeType: "audio/webm",
        duration: 5000,
      });
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });

    // Offline prompt should be visible; transcript callback not invoked.
    await waitFor(() =>
      expect(screen.getByText(/no internet connection/i)).toBeTruthy(),
    );
    expect(onTranscriptReady).not.toHaveBeenCalled();

    // Step 2 — WiFi comes back; user taps Transcribe. This call succeeds.
    mockTranscribe.mockResolvedValueOnce("I love chocolate");

    fireEvent.click(screen.getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      expect(onTranscriptReady).toHaveBeenCalledWith("I love chocolate");
      // Offline prompt is gone after a successful transcription.
      expect(screen.queryByText(/no internet connection/i)).toBeNull();
    });
  });
});
