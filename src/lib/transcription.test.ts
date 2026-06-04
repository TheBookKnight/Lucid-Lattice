import { describe, expect, it } from "vitest";

import { WhisperTinyProvider, selectSpeechProvider } from "@/lib/transcription";

describe("WhisperTinyProvider", () => {
  it("reports available when Worker and AudioContext exist", async () => {
    const provider = new WhisperTinyProvider();
    const available = await provider.isAvailable();
    // happy-dom provides Worker and AudioContext globals
    expect(typeof available).toBe("boolean");
  });

  it("returns false when window is undefined", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    delete globalThis.window;
    const provider = new WhisperTinyProvider();
    const available = await provider.isAvailable();
    expect(available).toBe(false);
    globalThis.window = originalWindow;
  });
});

describe("selectSpeechProvider", () => {
  it("returns WhisperTinyProvider when Worker and AudioContext are available", async () => {
    // happy-dom should have Worker and AudioContext
    const provider = await selectSpeechProvider();
    if (provider) {
      expect(provider).toBeInstanceOf(WhisperTinyProvider);
    }
  });

  it("returns null when Worker is not available", async () => {
    const originalWorker = globalThis.Worker;
    // @ts-expect-error - removing Worker
    delete globalThis.Worker;
    const provider = await selectSpeechProvider();
    expect(provider).toBeNull();
    globalThis.Worker = originalWorker;
  });
});
