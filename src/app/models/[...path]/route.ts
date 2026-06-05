import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join("/");
  const url = `https://huggingface.co/${filePath}${request.nextUrl.search}`;

  try {
    const res = await fetch(url);
    const headers = new Headers();
    
    // Copy essential headers
    const contentType = res.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    
    const contentLength = res.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    
    // Set CORS headers
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    
    return new Response(res.body, {
      status: res.status,
      headers,
    });
  } catch (error) {
    return new Response("Failed to fetch model file", { status: 500 });
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
