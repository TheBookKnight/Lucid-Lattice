import { getCloudflareContext } from "@opennextjs/cloudflare";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhisperResult = { text: string; words?: any[] };

export async function POST(request: Request) {
  // Grab Cloudflare context — AI binding is only available in the edge runtime.
  let ai: { run: (model: string, input: object) => Promise<WhisperResult> } | undefined;
  try {
    const cf = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ai = (cf?.env as any)?.AI;
  } catch {
    // getCloudflareContext throws in non-Worker environments (e.g. local Next.js dev)
  }

  if (!ai) {
    return Response.json(
      { error: "Transcription service unavailable. AI binding not configured." },
      { status: 503 },
    );
  }

  // The client sends the raw audio Blob bytes (WebM, MP4, WAV, etc.).
  // @cf/openai/whisper expects uint8 bytes of an encoded audio file — NOT raw PCM floats.
  let audioArray: number[];
  try {
    const bodyBuffer = await request.arrayBuffer();
    if (bodyBuffer.byteLength === 0) {
      return Response.json({ error: "Empty audio payload." }, { status: 400 });
    }
    audioArray = Array.from(new Uint8Array(bodyBuffer));
  } catch {
    return Response.json({ error: "Failed to parse audio payload." }, { status: 400 });
  }

  try {
    const result = await ai.run("@cf/openai/whisper", { audio: audioArray });
    return Response.json({ text: (result.text ?? "").trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whisper inference failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
