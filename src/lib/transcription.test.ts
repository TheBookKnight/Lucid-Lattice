import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CloudflareAIProvider,
  OfflineError,
  blobToFloat32Audio,
  selectSpeechProvider,
} from "@/lib/transcription";

// ---------------------------------------------------------------------------
// CloudflareAIProvider
// ---------------------------------------------------------------------------

describe("CloudflareAIProvider", () => {
  const provider = new CloudflareAIProvider();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── isAvailable() ──────────────────────────────────────────────────────────

  describe("isAvailable()", () => {
    it("returns true when fetch is available in the browser", async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it("returns false in an SSR context where window is undefined", async () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulating SSR
      delete globalThis.window;
      expect(await provider.isAvailable()).toBe(false);
      globalThis.window = originalWindow;
    });
  });

  // ── transcribe() — happy path ──────────────────────────────────────────────

  describe("transcribe() — Scenario 1: online, transcription works", () => {
    it("posts the raw audio bytes and returns the transcribed text", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: "I love chocolate" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const audio = new Blob(["fake-audio-bytes"], { type: "audio/webm" });
      const result = await provider.transcribe(audio);

      expect(result).toBe("I love chocolate");

      // Verify the request shape — raw bytes, correct content-type.
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/transcribe",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "audio/webm" },
        }),
      );
    });

    it("reports progress via the onProgress callback", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: "Hello" }),
      }));

      const onProgress = vi.fn();
      const audio = new Blob(["audio"], { type: "audio/webm" });
      await provider.transcribe(audio, onProgress);

      // Must fire at least at 10% (start), 30% (sending) and 100% (done).
      expect(onProgress).toHaveBeenCalledWith(10, expect.any(String));
      expect(onProgress).toHaveBeenCalledWith(30, expect.any(String));
      expect(onProgress).toHaveBeenCalledWith(100, "Done");
    });

    it("falls back to audio/webm content-type when blob type is empty", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: "ok" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Blob with no explicit type.
      const audio = new Blob(["bytes"]);
      await provider.transcribe(audio);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("audio/webm");
    });
  });

  // ── transcribe() — offline / error paths ──────────────────────────────────

  describe("transcribe() — Scenario 2: no internet connection", () => {
    it("throws OfflineError when fetch rejects with a network error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      );

      const audio = new Blob(["audio"], { type: "audio/webm" });
      await expect(provider.transcribe(audio)).rejects.toBeInstanceOf(OfflineError);
    });

    it("OfflineError message mentions WiFi so users know what to do", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("NetworkError")),
      );

      const audio = new Blob(["audio"], { type: "audio/webm" });
      try {
        await provider.transcribe(audio);
      } catch (err) {
        expect(err).toBeInstanceOf(OfflineError);
        expect((err as Error).message).toMatch(/wifi/i);
      }
    });
  });

  describe("transcribe() — server error paths", () => {
    it("throws an Error with the server message when the API returns 500", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "AI service unavailable" }),
      }));

      const audio = new Blob(["audio"], { type: "audio/webm" });
      await expect(provider.transcribe(audio)).rejects.toThrow("AI service unavailable");
    });

    it("falls back to statusText when the server error body has no error field", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: () => Promise.resolve({}),
      }));

      const audio = new Blob(["audio"], { type: "audio/webm" });
      await expect(provider.transcribe(audio)).rejects.toThrow("Transcription failed.");
    });
  });
});

// ---------------------------------------------------------------------------
// OfflineError
// ---------------------------------------------------------------------------

describe("OfflineError", () => {
  it("is an instance of Error", () => {
    expect(new OfflineError()).toBeInstanceOf(Error);
  });

  it("has name 'OfflineError'", () => {
    expect(new OfflineError().name).toBe("OfflineError");
  });

  it("includes a WiFi hint in its message", () => {
    expect(new OfflineError().message).toMatch(/wifi/i);
  });

  it("is recognisable via instanceof after being thrown and caught", () => {
    expect(() => { throw new OfflineError(); }).toThrow(OfflineError);
  });
});

// ---------------------------------------------------------------------------
// selectSpeechProvider
// ---------------------------------------------------------------------------

describe("selectSpeechProvider", () => {
  it("returns a CloudflareAIProvider when fetch is available", async () => {
    const p = await selectSpeechProvider();
    expect(p).toBeInstanceOf(CloudflareAIProvider);
  });

  it("returns null when window is undefined (SSR)", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — simulating SSR
    delete globalThis.window;
    const p = await selectSpeechProvider();
    expect(p).toBeNull();
    globalThis.window = originalWindow;
  });
});

// ---------------------------------------------------------------------------
// blobToFloat32Audio (utility — still used by some consumers)
// ---------------------------------------------------------------------------

describe("blobToFloat32Audio", () => {
  it("is exported from the transcription module", () => {
    expect(typeof blobToFloat32Audio).toBe("function");
  });
});
