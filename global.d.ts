declare module "*.css";

declare module "natural/lib/natural/util/stopwords" {
  const naturalStopwords: {
    words: string[];
  };

  export default naturalStopwords;
}
