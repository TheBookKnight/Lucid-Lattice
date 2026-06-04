import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJournalStore } from "@/store/use-journal-store";

// Mock IndexedDB-dependent modules
vi.mock("@/lib/db", () => ({
  getEntries: vi.fn().mockResolvedValue([]),
  saveEntry: vi.fn().mockResolvedValue(undefined),
  clearEntries: vi.fn().mockResolvedValue(undefined),
  importEntries: vi.fn().mockResolvedValue({ imported: 0, skipped: 0 }),
}));

vi.mock("@/lib/requestPersistentStorage", () => ({
  requestPersistence: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/transcription", () => ({
  selectSpeechProvider: vi.fn().mockResolvedValue(null),
}));

// Import AppShell after mocks are set up
import { AppShell } from "@/components/app-shell";

afterEach(cleanup);

beforeEach(() => {
  useJournalStore.getState().resetDraft();
});

describe("AppShell save validation", () => {
  it("disables save button when all fields are empty", () => {
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when only transcript is filled", () => {
    useJournalStore.getState().updateDraft("transcript", "A vivid dream");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when only title is filled", () => {
    useJournalStore.getState().updateDraft("title", "Ocean dream");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when title and transcript are filled but no emotion selected", () => {
    useJournalStore.getState().updateDraft("title", "Ocean dream");
    useJournalStore.getState().updateDraft("transcript", "I was flying over the ocean");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when transcript and emotion are filled but title is empty", () => {
    useJournalStore.getState().updateDraft("transcript", "I was flying");
    useJournalStore.getState().toggleEmotion("Joy");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when title and emotion are filled but transcript is empty", () => {
    useJournalStore.getState().updateDraft("title", "Ocean dream");
    useJournalStore.getState().toggleEmotion("Joy");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when title, transcript, and at least one emotion are provided", () => {
    useJournalStore.getState().updateDraft("title", "Ocean dream");
    useJournalStore.getState().updateDraft("transcript", "I was flying over the ocean");
    useJournalStore.getState().toggleEmotion("Joy");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("disables save button when title is only whitespace", () => {
    useJournalStore.getState().updateDraft("title", "   ");
    useJournalStore.getState().updateDraft("transcript", "A dream");
    useJournalStore.getState().toggleEmotion("Fear");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("disables save button when transcript is only whitespace", () => {
    useJournalStore.getState().updateDraft("title", "Dream title");
    useJournalStore.getState().updateDraft("transcript", "   ");
    useJournalStore.getState().toggleEmotion("Fear");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    expect(saveButton).toBeDisabled();
  });

  it("re-disables save button after deselecting the only emotion", () => {
    useJournalStore.getState().updateDraft("title", "Dream");
    useJournalStore.getState().updateDraft("transcript", "Content");
    useJournalStore.getState().toggleEmotion("Joy");
    const { rerender } = render(<AppShell />);
    expect(screen.getByRole("button", { name: /save dream entry/i })).not.toBeDisabled();

    // Deselect the emotion
    useJournalStore.getState().toggleEmotion("Joy");
    rerender(<AppShell />);
    expect(screen.getByRole("button", { name: /save dream entry/i })).toBeDisabled();
  });

  it("does not call save when form is incomplete and button is clicked", async () => {
    const { saveEntry } = await import("@/lib/db");
    useJournalStore.getState().updateDraft("transcript", "Only transcript");
    render(<AppShell />);
    const saveButton = screen.getByRole("button", { name: /save dream entry/i });
    fireEvent.click(saveButton);
    expect(saveEntry).not.toHaveBeenCalled();
  });
});

describe("AppShell UI order", () => {
  it("renders Audio Recording section between Tags and Transcript", () => {
    render(<AppShell />);
    const container = document.querySelector("main");
    const html = container?.innerHTML ?? "";
    const tagsIndex = html.indexOf("Tags");
    const audioIndex = html.indexOf("Audio Recording");
    const transcriptIndex = html.indexOf("Transcript");
    expect(tagsIndex).toBeLessThan(audioIndex);
    expect(audioIndex).toBeLessThan(transcriptIndex);
  });

  it("displays accurate copy about transcription", () => {
    render(<AppShell />);
    expect(screen.getByText(/tap Transcribe to generate text locally/i)).toBeTruthy();
  });
});
