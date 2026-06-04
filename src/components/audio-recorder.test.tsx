import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock db
vi.mock("@/lib/db", () => ({
  getAudioBlob: vi.fn().mockResolvedValue(null),
  saveAudioBlob: vi.fn().mockResolvedValue(undefined),
  deleteAudioBlob: vi.fn().mockResolvedValue(undefined),
}));

// Mock transcription
const mockTranscribe = vi.fn();
vi.mock("@/lib/transcription", () => ({
  selectSpeechProvider: vi.fn().mockResolvedValue({
    transcribe: (...args: unknown[]) => mockTranscribe(...args),
  }),
}));

import { AudioRecorder } from "@/components/audio-recorder";

afterEach(() => {
  cleanup();
  mockTranscribe.mockReset();
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
    // Simulate audio URL by providing a blobId and mocking getAudioBlob
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

  it("calls onTranscriptReady when transcription succeeds", async () => {
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
      // After deletion, Transcribe should not be visible
      expect(screen.queryByRole("button", { name: /transcribe/i })).toBeNull();
    });
  });
});
