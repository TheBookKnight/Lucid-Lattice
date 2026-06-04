import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

// Prevent model downloads from local filesystem (always use CDN)
env.allowLocalModels = false;

export type TranscriberMessage =
  | { type: "progress"; progress: number; message: string }
  | { type: "success"; text: string }
  | { type: "error"; error: string };

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

  pipelineInstance = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en",
    {
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

    const result = await transcriber(audio, {
      language: "en",
      task: "transcribe",
    });

    const text = Array.isArray(result)
      ? result.map((r) => r.text).join(" ")
      : result.text;

    self.postMessage({
      type: "success",
      text: text.trim(),
    } satisfies TranscriberMessage);
  } catch (err) {
    self.postMessage({
      type: "error",
      error: err instanceof Error ? err.message : "Transcription failed.",
    } satisfies TranscriberMessage);
  }
};
