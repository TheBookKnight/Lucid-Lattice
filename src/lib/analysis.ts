import nlp from "compromise";
import naturalStopwords from "natural/lib/natural/util/stopwords";

import {
  EMOTIONS,
  type AnalysisFilters,
  type AnalysisMetric,
  type AnalysisSnapshot,
  type DraftEntry,
  type Entry,
  type ExtractedEntity,
  type Timeframe,
} from "@/types/journal";

const fillerWords = new Set([
  "um",
  "uh",
  "hmm",
  "ah",
  "like",
  "actually",
  "literally",
  "basically",
  "sort",
  "kind",
  "maybe",
  "thing",
  "things",
]);

const stopWordSet = new Set(naturalStopwords.words.map((word) => word.toLowerCase()));
const wordPattern = /[a-zA-Z][a-zA-Z'-]+/g;

export const defaultFilters: AnalysisFilters = {
  timeframe: "30d",
  emotion: "all",
  minIntensity: 1,
  entryType: "all",
  lucidOnly: false,
  nightmareOnly: false,
  doubleValencedOnly: false,
};

export function createEmptyDraft(type: DraftEntry["type"] = "dream"): DraftEntry {
  return {
    type,
    transcript: "",
    editedTranscript: "",
    title: "",
    tagsInput: "",
    sleepQuality: 5,
    lucidDream: false,
    nightmare: false,
    recurringDream: false,
    emotions: [],
    notes: "",
  };
}

export function parseTags(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function getEntryText(entry: Pick<Entry, "editedTranscript" | "transcript" | "notes" | "title">): string {
  return [entry.title, entry.editedTranscript || entry.transcript, entry.notes]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function tokenizeText(text: string): string[] {
  return (text.toLowerCase().match(wordPattern) ?? []).filter((word) => {
    const normalized = word.replace(/['-]/g, "");
    return normalized.length > 2 && !stopWordSet.has(normalized) && !fillerWords.has(normalized);
  });
}

function collectCounts(values: string[]): AnalysisMetric[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

export function extractEntities(text: string): ExtractedEntity[] {
  const doc = nlp(text);
  const buckets: Array<{ type: ExtractedEntity["type"]; values: string[] }> = [
    { type: "person", values: doc.people().out("array") as string[] },
    { type: "place", values: doc.places().out("array") as string[] },
    { type: "noun", values: doc.nouns().out("array") as string[] },
  ];

  return buckets.flatMap(({ type, values }) => {
    const counts = collectCounts(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase()),
    );

    return counts.map(({ label, count }) => ({
      id: `${type}:${label}`,
      type,
      value: label,
      normalizedValue: label,
      frequency: count,
    }));
  });
}

function applyTimeframe(entries: Entry[], timeframe: Timeframe): Entry[] {
  if (timeframe === "all") {
    return entries;
  }

  const days = Number.parseInt(timeframe, 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
}

export function filterEntries(entries: Entry[], filters: AnalysisFilters): Entry[] {
  return applyTimeframe(entries, filters.timeframe).filter((entry) => {
    if (filters.entryType !== "all" && entry.type !== filters.entryType) {
      return false;
    }

    if (filters.lucidOnly && !entry.lucidDream) {
      return false;
    }

    if (filters.nightmareOnly && !entry.nightmare) {
      return false;
    }

    if (filters.doubleValencedOnly && !entry.emotions.some((emotion) => emotion.doubleValenced)) {
      return false;
    }

    if (filters.emotion === "all") {
      return true;
    }

    return entry.emotions.some(
      (emotion) => emotion.emotion === filters.emotion && emotion.intensity >= filters.minIntensity,
    );
  });
}

function buildEmotionTrends(entries: Entry[]): AnalysisSnapshot["emotionalTrends"] {
  const trends = new Map<string, Record<string, number | string>>();

  for (const entry of entries) {
    const day = entry.createdAt.slice(0, 10);
    const current =
      trends.get(day) ??
      Object.fromEntries(["date", ...EMOTIONS].map((emotion) => [emotion === "date" ? emotion : emotion, 0]));

    current.date = day;

    for (const emotion of entry.emotions) {
      current[emotion.emotion] = Number(current[emotion.emotion] ?? 0) + emotion.intensity;
    }

    trends.set(day, current);
  }

  return [...trends.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function buildAnalysis(entries: Entry[], filters: AnalysisFilters = defaultFilters): AnalysisSnapshot {
  const filteredEntries = filterEntries(entries, filters);
  const entryTexts = filteredEntries.map(getEntryText);
  const wordCounts = collectCounts(entryTexts.flatMap(tokenizeText)).slice(0, 8);

  const recurringEntities = collectCounts(
    filteredEntries.flatMap((entry) => entry.extractedEntities.map((entity) => `${entity.type}:${entity.normalizedValue}`)),
  )
    .slice(0, 8)
    .map(({ label, count }) => {
      const [type, ...rest] = label.split(":");
      return {
        label: rest.join(":"),
        count,
        type: type as ExtractedEntity["type"],
      };
    });

  const emotionTotals = collectCounts(
    filteredEntries.flatMap((entry) =>
      entry.emotions
        .filter((emotion) => emotion.intensity >= filters.minIntensity)
        .map((emotion) => emotion.emotion.toLowerCase()),
    ),
  ).map(({ label, count }) => ({ label: label.replace(/^./, (char) => char.toUpperCase()), count }));

  const correlations = collectCounts(
    filteredEntries.flatMap((entry) => {
      const primaryEmotion = entry.emotions.sort((a, b) => b.intensity - a.intensity)[0]?.emotion;
      if (!primaryEmotion) {
        return [];
      }

      return tokenizeText(getEntryText(entry)).slice(0, 5).map((word) => `${primaryEmotion}: ${word}`);
    }),
  )
    .slice(0, 6)
    .map(({ label, count }) => ({ label, count }));

  return {
    timeframe: filters.timeframe,
    totalEntries: filteredEntries.length,
    topWords: wordCounts,
    recurringEntities,
    emotionalTrends: buildEmotionTrends(filteredEntries),
    correlations: emotionTotals.length > 0 ? emotionTotals : correlations,
  };
}

export function emotionSummary(emotions: Entry["emotions"]): string {
  return emotions
    .map((emotion) => `${emotion.emotion} ${emotion.intensity}${emotion.doubleValenced ? " • mixed" : ""}`)
    .join(", ");
}
