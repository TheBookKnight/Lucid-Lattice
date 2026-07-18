import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

// Extract origin from self.location or the blob URL if loaded as a blob
let origin = "";
if (typeof self !== "undefined" && self.location) {
  const href = self.location.href;
  if (href.startsWith("blob:")) {
    try {
      const match = href.match(/blob:(https?:\/\/[^\/]+)/);
      if (match) {
        origin = match[1];
      } else {
        origin = new URL(href.slice(5)).origin;
      }
    } catch {
      origin = self.location.origin;
    }
  } else {
    origin = self.location.origin;
  }
}

if (!origin || origin === "null") {
  origin = "";
}

// Prevent model downloads from local filesystem (always use CDN)
env.allowLocalModels = false;

// Configure Hugging Face transformers to fetch models locally from our public folder (via Next.js rewrite proxy).
// This serves them same-origin, avoiding CORS and CORP/COEP issues.
env.remoteHost = `${origin}/`;
env.remotePathTemplate = "models/{model}/resolve/main/";



// Disable WASM caching to prevent the library from loading the WASM factory as a blob URL.
// When loaded as a blob URL, relative URL resolution inside the factory throws "Invalid URL".
env.useWasmCache = false;

// Configure ONNX Runtime WASM backend to use our self-hosted WASM files from /public/wasm/.
// Use the JSPI (JavaScript Promise Integration) variant - a completely different async mechanism
// from asyncify (global state machine, failed in production) and non-asyncify (also failed).
// JSPI is natively supported in Chrome 126+ and handles async WASM operations without the
// asyncify global state corruption issue.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${origin}/wasm/ort-wasm-simd-threaded.jspi.mjs`,
    wasm: `${origin}/wasm/ort-wasm-simd-threaded.jspi.wasm`,
  } as Record<string, string>;

  // Pin to single-threaded mode.
  env.backends.onnx.wasm.numThreads = 1;
}

export type TranscriberMessage =
  | { type: "progress"; progress: number; message: string }
  | { type: "success"; text: string }
  | { type: "error"; error: string; stage: "worker-init" | "model-load" | "inference" };

export type TranscriberInput = {
  type: "transcribe";
  audio: Float32Array;
};

let pipelineInstance: AutomaticSpeechRecognitionPipeline | null = null;

/** Fetch the decoder ONNX file and verify the transfer completed cleanly. */
async function runModelIntegrityCheck(): Promise<void> {
  // q4 decoder: ~86MB (the version in R2)
  const decoderUrl = `${origin}/models/onnx-community/whisper-tiny.en/resolve/main/onnx/decoder_model_merged_q4.onnx`;
  try {
    console.log("[DIAG] crossOriginIsolated:", (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated);
    console.log("[DIAG] ORT numThreads:", env.backends?.onnx?.wasm?.numThreads);
    console.log("[DIAG] ORT wasmPaths:", JSON.stringify(env.backends?.onnx?.wasm?.wasmPaths));
    console.log("[DIAG] Fetching FULL decoder model from:", decoderUrl);

    const resp = await fetch(decoderUrl);
    const contentLength = resp.headers.get("content-length");
    console.log("[DIAG] Response status:", resp.status, "Content-Length header:", contentLength);

    // Read ALL chunks and tally total bytes received
    const reader = resp.body!.getReader();
    let totalBytes = 0;
    let firstChunk: Uint8Array | null = null;
    let lastChunk: Uint8Array | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunk === null) firstChunk = value;
      lastChunk = value;
      totalBytes += value.length;
    }

    console.log(`[DIAG] Total bytes received: ${totalBytes}`);
    if (totalBytes > 10_000_000) {
      console.log("[DIAG] ✅ Received substantial data — no major truncation");
    } else {
      console.error(`[DIAG] ❌ Suspiciously few bytes: ${totalBytes} — possible fetch failure`);
    }

    if (firstChunk) {
      const first8 = Array.from(firstChunk.slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      console.log(`[DIAG] First 8 bytes: ${first8}`);
      if (firstChunk[0] === 0x08 && firstChunk[1] === 0x09) {
        console.log("[DIAG] ✅ First bytes = valid ONNX protobuf (ir_version:9)");
      } else {
        console.error("[DIAG] ❌ First bytes do NOT match expected ONNX magic:", first8);
      }
    }
    if (lastChunk) {
      const last8 = Array.from(lastChunk.slice(-8)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
      console.log(`[DIAG] Last chunk size: ${lastChunk.length}, last 8 bytes: ${last8}`);
      const allZero = lastChunk.slice(-8).every((b) => b === 0);
      if (allZero) {
        console.error("[DIAG] ❌ Last 8 bytes are ALL ZEROS — file likely truncated or corrupted!");
      } else {
        console.log("[DIAG] ✅ Last bytes look non-zero (file likely complete)");
      }
    }
  } catch (e) {
    console.error("[DIAG] Integrity check failed with exception:", e);
  }
}

async function loadPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (pipelineInstance) return pipelineInstance;

  self.postMessage({
    type: "progress",
    progress: 0,
    message: "Loading transcription model…",
  } satisfies TranscriberMessage);

  // Run pre-flight check so we can see in DevTools what the Worker actually receives.
  await runModelIntegrityCheck();

  try {
    pipelineInstance = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny.en",
      {
        device: "wasm",
        dtype: "q4",
        // Use "basic" graph optimization (not "disabled") to skip the broken extended-level
        // TransposeDQWeightsForMatMulNBits pass without triggering a possible level=0 crash
        // in ORT 1.26.0-dev WASM. "basic" skips all extended/layout optimizations including
        // the buggy MatMulNBits transpose while keeping the well-tested basic constant folding.
        session_options: {
          graphOptimizationLevel: "basic",
        },
        progress_callback: (data: { progress?: number; status?: string }) => {
          if (typeof data.progress === "number") {
            self.postMessage({
              type: "progress",
              progress: Math.round(data.progress),
              message: data.status === "download" ? "Downloading model…" : "Loading model…",
            } satisfies TranscriberMessage);
          }
        },
      },
    );
  } catch (err) {
    // If loading fails (e.g. due to corrupted/truncated cache), clear the cache so next load gets a fresh download
    try {
      if (typeof caches !== "undefined") {
        await caches.delete("transformers-cache");
        if (env.cacheKey) {
          await caches.delete(env.cacheKey);
        }
      }
    } catch (cacheErr) {
      console.error("Failed to clear cache after model load error:", cacheErr);
    }
    const message = err instanceof Error ? err.message : "Unknown model load error";
    throw new Error(`Model load failed: ${message}`);
  }

  return pipelineInstance;
}

self.onmessage = async (event: MessageEvent<TranscriberInput>) => {
  const { audio } = event.data;

  try {
    const transcriber = await loadPipeline();

    // --- Audio diagnostics ---
    const durationSec = (audio.length / 16000).toFixed(2);
    let sumSq = 0;
    let maxAbs = 0;
    for (let i = 0; i < audio.length; i++) {
      const v = Math.abs(audio[i]);
      sumSq += v * v;
      if (v > maxAbs) maxAbs = v;
    }
    const rms = Math.sqrt(sumSq / audio.length);
    console.log(`[AUDIO DIAG] samples=${audio.length} duration=${durationSec}s maxAbs=${maxAbs.toFixed(5)} rms=${rms.toFixed(5)}`);
    if (rms < 0.001) {
      console.warn('[AUDIO DIAG] ⚠️ RMS is near-zero — audio is silent or empty, Whisper will hallucinate');
    } else {
      console.log('[AUDIO DIAG] ✅ Audio has signal, proceeding with inference');
    }
    // --- end audio diagnostics ---

    self.postMessage({
      type: "progress",
      progress: 50,
      message: "Transcribing…",
    } satisfies TranscriberMessage);

    let result;
    try {
      result = await transcriber(audio);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inference failed";
      self.postMessage({
        type: "error",
        error: `Inference failed: ${message}`,
        stage: "inference",
      } satisfies TranscriberMessage);
      return;
    }

    const text = Array.isArray(result)
      ? result.map((r) => r.text).join(" ")
      : result.text;

    self.postMessage({
      type: "success",
      text: text.trim(),
    } satisfies TranscriberMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed.";
    const stage = message.startsWith("Model load failed") ? "model-load" : "inference";
    self.postMessage({
      type: "error",
      error: message,
      stage,
    } satisfies TranscriberMessage);
  }
};
