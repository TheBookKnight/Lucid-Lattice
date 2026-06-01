import nlp from "compromise";
import naturalStopwords from "natural/lib/natural/util/stopwords";

import {
  EMOTIONS,
  type AnalysisFilters,
  type AnalysisMetric,
  type AnalysisSnapshot,
  type Emotion,
  type EmotionTag,
  type EntityType,
  type Entry,
  type ExtractedEntity,
  type PhraseMetric,
  type Timeframe,
} from "@/types/journal";
import type { DraftEntry } from "@/types/journal";

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
  lucidOnly: false,
  nightmareOnly: false,
  favoritesOnly: false,
};

export function createEmptyDraft(): DraftEntry {
  return {
    transcript: "",
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

export function getEntryText(entry: Pick<Entry, "transcript" | "notes" | "title">): string {
  return [entry.title, entry.transcript, entry.notes]
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

const phraseStopWords = new Set([
  ...Array.from(stopWordSet),
  ...Array.from(fillerWords),
]);

function isAllStopWords(phrase: string): boolean {
  return phrase.split(/\s+/).every((word) => phraseStopWords.has(word));
}

export function extractPhrases(text: string): string[] {
  const doc = nlp(text);

  const candidates: string[] = [
    ...(doc.nouns().out("array") as string[]),
    ...(doc.match("#Adjective+ #Noun+").out("array") as string[]),
    ...(doc.match("#Noun #Noun+").out("array") as string[]),
  ];

  const seen = new Set<string>();
  const results: string[] = [];

  for (const raw of candidates) {
    const phrase = raw.toLowerCase().trim().replace(/\s+/g, " ");
    const words = phrase.split(" ");
    if (words.length < 2) continue;
    if (isAllStopWords(phrase)) continue;
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    results.push(phrase);
  }

  return results;
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
    if (filters.favoritesOnly && !entry.isFavorite) {
      return false;
    }

    if (filters.lucidOnly && !entry.lucidDream) {
      return false;
    }

    if (filters.nightmareOnly && !entry.nightmare) {
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
  const wordCounts = collectCounts(entryTexts.flatMap(tokenizeText)).slice(0, 30);

  const phraseCounts = collectCounts(entryTexts.flatMap(extractPhrases)).slice(0, 30);

  const halfCount = Math.ceil(filteredEntries.length / 2);
  const recentEntries = filteredEntries.slice(0, halfCount);
  const recentPhraseSet = new Set(recentEntries.flatMap((entry) => extractPhrases(getEntryText(entry))));

  const topPhrases: PhraseMetric[] = phraseCounts.map(({ label, count }) => {
    const lastEntry = filteredEntries.find((entry) => extractPhrases(getEntryText(entry)).includes(label));
    const topEmotion =
      lastEntry?.emotions.sort((a, b) => b.intensity - a.intensity)[0]?.emotion ?? null;

    return {
      label,
      count,
      trend: recentPhraseSet.has(label) ? "up" : "stable",
      lastSeen: lastEntry?.createdAt.slice(0, 10) ?? "",
      topEmotion,
    };
  });

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
    topPhrases,
    recurringEntities,
    emotionalTrends: buildEmotionTrends(filteredEntries),
    correlations: emotionTotals.length > 0 ? emotionTotals : correlations,
  };
}

export function emotionSummary(emotions: Entry["emotions"]): string {
  return emotions
    .map((emotion) => `${emotion.emotion} ${emotion.intensity}`)
    .join(", ");
}

export const CSV_HEADERS = [
  "id",
  "createdAt",
  "transcript",
  "title",
  "tags",
  "sleepQuality",
  "lucidDream",
  "nightmare",
  "recurringDream",
  "emotions",
  "notes",
  "extractedEntities",
  "isFavorite",
] as const;

export function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCSV(entries: Entry[]): string {
  const rows = entries.map((entry) => {
    const emotions = entry.emotions.map((e) => `${e.emotion}:${e.intensity}`).join("; ");
    const tags = entry.tags.join("; ");
    const entities = entry.extractedEntities
      .map((e) => `${e.type}:${e.value}`)
      .join("; ");
    return [
      String(entry.id ?? ""),
      entry.createdAt,
      escapeCSV(entry.transcript),
      escapeCSV(entry.title),
      escapeCSV(tags),
      String(entry.sleepQuality),
      String(entry.lucidDream),
      String(entry.nightmare),
      String(entry.recurringDream),
      escapeCSV(emotions),
      escapeCSV(entry.notes),
      escapeCSV(entities),
      String(entry.isFavorite),
    ].join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

export interface ImportResult {
  entries: Entry[];
  errors: string[];
}

function parseCSVRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const fields: string[] = [];

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else if (char === "\n" || (char === "\r" && csvContent[i + 1] === "\n")) {
        if (char === "\r") i++;
        fields.push(current);
        current = "";
        if (fields.some((f) => f.trim())) {
          rows.push([...fields]);
        }
        fields.length = 0;
      } else {
        current += char;
      }
    }
  }
  // Last row
  fields.push(current);
  if (fields.some((f) => f.trim())) {
    rows.push([...fields]);
  }

  return rows;
}

function parseEmotions(value: string): EmotionTag[] {
  if (!value.trim()) return [];
  return value.split(";").map((pair) => {
    const [emotion, intensityStr] = pair.trim().split(":");
    return {
      emotion: emotion.trim() as Emotion,
      intensity: Number(intensityStr) || 5,
    };
  }).filter((e) => e.emotion);
}

function parseEntities(value: string): ExtractedEntity[] {
  if (!value.trim()) return [];
  return value.split(";").map((pair, idx) => {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) return null;
    const type = pair.slice(0, colonIdx).trim() as EntityType;
    const entityValue = pair.slice(colonIdx + 1).trim();
    if (!type || !entityValue) return null;
    return {
      id: `imported-${idx}-${entityValue}`,
      type,
      value: entityValue,
      normalizedValue: entityValue.toLowerCase(),
      frequency: 1,
    };
  }).filter((e): e is ExtractedEntity => e !== null);
}

export function importCSV(csvContent: string): ImportResult {
  const errors: string[] = [];
  const entries: Entry[] = [];

  if (!csvContent.trim()) {
    return { entries: [], errors: ["Empty CSV file"] };
  }

  const rows = parseCSVRows(csvContent);
  if (rows.length === 0) {
    return { entries: [], errors: ["Empty CSV file"] };
  }

  const headerLine = rows[0];
  const headerSet = new Set(headerLine.map((h) => h.trim()));
  const requiredHeaders = ["createdAt", "transcript"];
  for (const required of requiredHeaders) {
    if (!headerSet.has(required)) {
      return { entries: [], errors: [`Missing required header: ${required}`] };
    }
  }

  const headerIndex = Object.fromEntries(headerLine.map((h, i) => [h.trim(), i]));

  for (let i = 1; i < rows.length; i++) {
    try {
      const fields = rows[i];
      const get = (col: string): string => {
        const idx = headerIndex[col];
        return idx !== undefined && idx < fields.length ? fields[idx] : "";
      };

      const entry: Entry = {
        createdAt: get("createdAt") || new Date().toISOString(),
        transcript: get("transcript"),
        title: get("title") || "",
        tags: get("tags") ? get("tags").split(";").map((t) => t.trim()).filter(Boolean) : [],
        sleepQuality: Number(get("sleepQuality")) || 5,
        lucidDream: get("lucidDream") === "true",
        nightmare: get("nightmare") === "true",
        recurringDream: get("recurringDream") === "true",
        emotions: parseEmotions(get("emotions")),
        notes: get("notes") || "",
        extractedEntities: parseEntities(get("extractedEntities")),
        isFavorite: get("isFavorite") === "true",
      };

      const idStr = get("id");
      if (idStr && !isNaN(Number(idStr))) {
        entry.id = Number(idStr);
      }

      entries.push(entry);
    } catch {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return { entries, errors };
}
