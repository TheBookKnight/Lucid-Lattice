import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

// Prevent model downloads from local filesystem (always use CDN)
env.allowLocalModels = false;

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
        dtype: "fp32",
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
      result = await transcriber(audio, {
        language: "en",
        task: "transcribe",
      });
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
