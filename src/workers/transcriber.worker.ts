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

// Configure Hugging Face transformers to fetch models locally from our public folder.
// This serves them same-origin, avoiding CORP/COEP issues.
env.remoteHost = `${origin}/`;
env.remotePathTemplate = "models/{model}/";

// Disable WASM caching to prevent the library from loading the WASM factory as a blob URL.
// When loaded as a blob URL, relative URL resolution inside the factory throws "Invalid URL".
env.useWasmCache = false;

// Configure ONNX Runtime WASM backend to use local files from our public folder.
// This avoids dynamic import failures of nonexistent .asyncify.mjs files on CDN,
// keeps all speech transcription logic fully self-hosted, and allows offline operation.
if (env.backends.onnx.wasm) {
  const originalPaths = env.backends.onnx.wasm.wasmPaths;
  const isAsyncify = typeof originalPaths === "object" && 
    originalPaths?.mjs && 
    String(originalPaths.mjs).includes("asyncify");

  env.backends.onnx.wasm.wasmPaths = {
    // Specific filename mappings
    'ort-wasm-simd-threaded.wasm': `${origin}/wasm/ort-wasm-simd-threaded.wasm`,
    'ort-wasm-simd-threaded.mjs': `${origin}/wasm/ort-wasm-simd-threaded.mjs`,
    'ort-wasm-simd-threaded.asyncify.wasm': `${origin}/wasm/ort-wasm-simd-threaded.asyncify.wasm`,
    'ort-wasm-simd-threaded.asyncify.mjs': `${origin}/wasm/ort-wasm-simd-threaded.asyncify.mjs`,
    // Fallback keys mapped based on the environment detection
    wasm: isAsyncify
      ? `${origin}/wasm/ort-wasm-simd-threaded.asyncify.wasm`
      : `${origin}/wasm/ort-wasm-simd-threaded.wasm`,
    mjs: isAsyncify
      ? `${origin}/wasm/ort-wasm-simd-threaded.asyncify.mjs`
      : `${origin}/wasm/ort-wasm-simd-threaded.mjs`,
  } as Record<string, string>;
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

async function loadPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (pipelineInstance) return pipelineInstance;

  self.postMessage({
    type: "progress",
    progress: 0,
    message: "Loading transcription model…",
  } satisfies TranscriberMessage);

  try {
    pipelineInstance = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny.en",
      {
        device: "wasm",
        dtype: "q4",
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
    const message = err instanceof Error ? err.message : "Unknown model load error";
    throw new Error(`Model load failed: ${message}`);
  }

  return pipelineInstance;
}

self.onmessage = async (event: MessageEvent<TranscriberInput>) => {
  const { audio } = event.data;

  try {
    const transcriber = await loadPipeline();

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
