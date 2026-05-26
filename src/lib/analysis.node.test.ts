import { describe, expect, it } from "vitest";

import { buildAnalysis, createEmptyDraft, exportCSV, extractEntities, extractPhrases, filterEntries, tokenizeText } from "@/lib/analysis";
import type { Entry } from "@/types/journal";

const baseEntry: Entry = {
  id: 1,
  createdAt: new Date().toISOString(),
  transcript: "I saw a silver wolf near the river with Morgan.",
  title: "Silver wolf",
  tags: ["wolf", "river"],
  sleepQuality: 7,
  lucidDream: true,
  nightmare: false,
  recurringDream: true,
  emotions: [
    { emotion: "Fear", intensity: 7 },
    { emotion: "Anticipation", intensity: 6 },
  ],
  notes: "Morgan was calm.",
  extractedEntities: extractEntities("Morgan stood near the river with a silver wolf."),
};

describe("analysis helpers", () => {
  it("creates a clean default draft", () => {
    expect(createEmptyDraft()).toMatchObject({
      transcript: "",
      sleepQuality: 5,
      emotions: [],
    });
  });

  it("filters stop words and filler terms", () => {
    expect(tokenizeText("Um I was basically walking through the moon garden.")).toEqual([
      "walking",
      "moon",
      "garden",
    ]);
  });

  it("extracts recurring named entities locally", () => {
    const entities = extractEntities("Morgan visited Paris and Morgan saw wolves in Paris.");
    expect(entities.some((entity) => entity.type === "person" && entity.normalizedValue === "morgan")).toBe(true);
    expect(entities.some((entity) => entity.type === "place" && entity.normalizedValue === "paris")).toBe(true);
  });

  it("applies analytics filters", () => {
    const entries: Entry[] = [
      baseEntry,
      {
        ...baseEntry,
        id: 2,
        lucidDream: false,
        recurringDream: false,
        emotions: [{ emotion: "Joy", intensity: 5 }],
      },
    ];

    expect(
      filterEntries(entries, {
        timeframe: "all",
        emotion: "Fear",
        minIntensity: 6,
        lucidOnly: true,
        nightmareOnly: false,
      }),
    ).toHaveLength(1);
  });

  it("builds word and emotion analytics", () => {
    const snapshot = buildAnalysis([baseEntry], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      lucidOnly: false,
      nightmareOnly: false,
    });

    expect(snapshot.totalEntries).toBe(1);
    expect(snapshot.topWords.some((item) => item.label === "silver")).toBe(true);
    expect(snapshot.correlations.some((item) => item.label === "Fear")).toBe(true);
  });
});

describe("extractPhrases", () => {
  it("returns only multi-word phrases", () => {
    const phrases = extractPhrases("I saw a silver wolf near the old red church.");
    for (const phrase of phrases) {
      expect(phrase.split(" ").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("normalizes phrases to lowercase", () => {
    const phrases = extractPhrases("Pacific Ocean and Black Wolf appeared in the dream.");
    for (const phrase of phrases) {
      expect(phrase).toBe(phrase.toLowerCase());
    }
  });

  it("deduplicates phrases within a text", () => {
    const phrases = extractPhrases("A silver wolf chased me. The silver wolf appeared again.");
    const unique = new Set(phrases);
    expect(unique.size).toBe(phrases.length);
  });

  it("extracts meaningful noun phrases from dream text", () => {
    const phrases = extractPhrases("I dreamed of a dark forest and an old church near the frozen river.");
    expect(phrases.some((p) => p.includes("old church") || p.includes("frozen river") || p.includes("dark forest"))).toBe(true);
  });

  it("returns empty array for short or stop-word-only text", () => {
    const phrases = extractPhrases("the and a is");
    expect(phrases).toHaveLength(0);
  });

  it("topPhrases included in buildAnalysis snapshot", () => {
    const entry: Entry = {
      ...baseEntry,
      transcript: "A silver wolf stood in the dark forest.",
      title: "Silver wolf",
    };
    const snapshot = buildAnalysis([entry], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      lucidOnly: false,
      nightmareOnly: false,
    });

    expect(Array.isArray(snapshot.topPhrases)).toBe(true);
    for (const phrase of snapshot.topPhrases) {
      expect(phrase).toHaveProperty("label");
      expect(phrase).toHaveProperty("count");
      expect(phrase).toHaveProperty("trend");
      expect(phrase).toHaveProperty("lastSeen");
      expect(phrase).toHaveProperty("topEmotion");
    }
  });
});

describe("exportCSV", () => {
  it("produces valid CSV with headers and data rows", () => {
    const csv = exportCSV([baseEntry]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,createdAt,transcript,summary,emotions,emotionIntensity,topPhrases,reflectiveNotes");
    expect(lines.length).toBe(2);
  });

  it("escapes commas and quotes in fields", () => {
    const entry: Entry = {
      ...baseEntry,
      transcript: 'He said, "hello, world"',
    };
    const csv = exportCSV([entry]);
    expect(csv).toContain('""hello');
  });

  it("handles empty entries array", () => {
    const csv = exportCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
  });
});
