declare module "*.css";

declare module "natural/lib/natural/util/stopwords" {
  const naturalStopwords: {
    words: string[];
  };

  export default naturalStopwords;
}

interface CloudflareEnv {
  MODELS_BUCKET?: import("@cloudflare/workers-types").R2Bucket;
}

