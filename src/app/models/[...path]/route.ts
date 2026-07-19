import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");

  // Since the user uploaded the files at the root level of the R2 bucket,
  // we map the request to the filename (the last segment of the path).
  const r2Key = path[path.length - 1];

  // Try to load from Cloudflare R2 bucket if bound
  try {
    const cf = getCloudflareContext();
    const bucket = cf?.env?.MODELS_BUCKET;

    if (bucket && r2Key) {
      const object = await bucket.get(r2Key);
      if (object) {
        const headers = new Headers();
        headers.set("Content-Type", "application/octet-stream");
        headers.set("Content-Length", object.size.toString());
        // 24-hour cache — intentionally NOT "immutable" so model updates can propagate
        headers.set("Cache-Control", "public, max-age=86400");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("X-Model-Source", "r2");

        return new Response(object.body, {
          headers,
        });
      }
    }
  } catch (err) {
    console.error("Error reading from R2 bucket:", err);
  }

  // Fallback to fetching from Hugging Face directly on the server side
  const url = `https://huggingface.co/${key}${request.nextUrl.search}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return new Response(`Failed to fetch from upstream: ${res.statusText}`, { status: res.status });
    }

    const headers = new Headers();
    const contentType = res.headers.get("content-type");
    headers.set("content-type", contentType || "application/octet-stream");

    const contentLength = res.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    // Never cache HuggingFace fallback responses — they may be wrong versions.
    // The browser should always re-validate through our Worker (which checks R2 first).
    headers.set("Cache-Control", "no-store");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("X-Model-Source", "huggingface-fallback");

    return new Response(res.body, {
      status: res.status,
      headers,
    });
  } catch {
    return new Response("Failed to fetch model file from upstream", { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
