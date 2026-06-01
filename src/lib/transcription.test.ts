import { describe, expect, it, vi } from "vitest";

import { NativeSpeechProvider, WhisperTinyProvider, selectSpeechProvider } from "@/lib/transcription";

describe("NativeSpeechProvider", () => {
  it("reports availability based on window.SpeechRecognition", async () => {
    const provider = new NativeSpeechProvider();
    // In test env (happy-dom/jsdom), SpeechRecognition is typically not available
    const available = await provider.isAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("returns false when window is undefined", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    delete globalThis.window;
    const provider = new NativeSpeechProvider();
    const available = await provider.isAvailable();
    expect(available).toBe(false);
    globalThis.window = originalWindow;
  });
});

describe("WhisperTinyProvider", () => {
  it("reports not available", async () => {
    const provider = new WhisperTinyProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it("throws not implemented on transcribe", async () => {
    const provider = new WhisperTinyProvider();
    await expect(provider.transcribe(new Blob())).rejects.toThrow("Not implemented");
  });
});

describe("selectSpeechProvider", () => {
  it("returns null when no provider is available", async () => {
    // Mock: no SpeechRecognition
    const original = window.SpeechRecognition;
    const originalWebkit = window.webkitSpeechRecognition;
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;

    const provider = await selectSpeechProvider();
    expect(provider).toBeNull();

    window.SpeechRecognition = original;
    window.webkitSpeechRecognition = originalWebkit;
  });

  it("returns native provider when SpeechRecognition is available", async () => {
    window.SpeechRecognition = vi.fn() as unknown as typeof window.SpeechRecognition;

    const provider = await selectSpeechProvider();
    expect(provider).toBeInstanceOf(NativeSpeechProvider);

    window.SpeechRecognition = undefined;
  });
});
