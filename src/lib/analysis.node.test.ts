import { describe, expect, it } from "vitest";

import { buildAnalysis, createEmptyDraft, exportCSV, extractEntities, extractPhrases, filterEntries, importCSV, tokenizeText } from "@/lib/analysis";
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
  isFavorite: false,
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
        favoritesOnly: false,
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
      favoritesOnly: false,
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
      favoritesOnly: false,
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
  it("produces valid CSV with all entry fields as headers", () => {
    const csv = exportCSV([baseEntry]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,createdAt,transcript,title,tags,sleepQuality,lucidDream,nightmare,recurringDream,emotions,notes,extractedEntities,isFavorite");
    expect(lines.length).toBe(2);
  });

  it("serializes all entry fields correctly", () => {
    const csv = exportCSV([baseEntry]);
    const lines = csv.split("\n");
    const dataRow = lines[1];
    expect(dataRow).toContain("Fear:7; Anticipation:6");
    expect(dataRow).toContain("wolf; river");
    expect(dataRow).toContain("true");
    expect(dataRow).toContain("7");
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

describe("importCSV", () => {
  it("round-trips entries through export and import", () => {
    const csv = exportCSV([baseEntry]);
    const result = importCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);

    const imported = result.entries[0];
    expect(imported.id).toBe(baseEntry.id);
    expect(imported.createdAt).toBe(baseEntry.createdAt);
    expect(imported.transcript).toBe(baseEntry.transcript);
    expect(imported.title).toBe(baseEntry.title);
    expect(imported.tags).toEqual(baseEntry.tags);
    expect(imported.sleepQuality).toBe(baseEntry.sleepQuality);
    expect(imported.lucidDream).toBe(baseEntry.lucidDream);
    expect(imported.nightmare).toBe(baseEntry.nightmare);
    expect(imported.recurringDream).toBe(baseEntry.recurringDream);
    expect(imported.emotions).toEqual(baseEntry.emotions);
    expect(imported.notes).toBe(baseEntry.notes);
  });

  it("handles entries with commas, quotes, and newlines in transcript", () => {
    const entry: Entry = {
      ...baseEntry,
      transcript: 'He said, "hello"\nThen walked away.',
      notes: 'Note with "quotes" and, commas',
    };
    const csv = exportCSV([entry]);
    const result = importCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries[0].transcript).toBe(entry.transcript);
    expect(result.entries[0].notes).toBe(entry.notes);
  });

  it("handles entries with empty emotions and tags", () => {
    const entry: Entry = {
      ...baseEntry,
      emotions: [],
      tags: [],
      extractedEntities: [],
    };
    const csv = exportCSV([entry]);
    const result = importCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries[0].emotions).toEqual([]);
    expect(result.entries[0].tags).toEqual([]);
    expect(result.entries[0].extractedEntities).toEqual([]);
  });

  it("returns error for empty CSV", () => {
    const result = importCSV("");
    expect(result.errors).toContain("Empty CSV file");
    expect(result.entries).toHaveLength(0);
  });

  it("returns error for missing required headers", () => {
    const result = importCSV("foo,bar\n1,2");
    expect(result.errors[0]).toContain("Missing required header");
    expect(result.entries).toHaveLength(0);
  });

  it("handles multiple entries round-trip", () => {
    const entries: Entry[] = [
      baseEntry,
      {
        ...baseEntry,
        id: 2,
        transcript: "Flying over a city",
        title: "Flight dream",
        tags: ["flying", "city"],
        lucidDream: false,
        emotions: [{ emotion: "Joy", intensity: 9 }],
      },
    ];
    const csv = exportCSV(entries);
    const result = importCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].transcript).toBe("I saw a silver wolf near the river with Morgan.");
    expect(result.entries[1].transcript).toBe("Flying over a city");
  });

  it("defaults missing optional fields gracefully", () => {
    const csv = "createdAt,transcript\n2024-01-01T00:00:00.000Z,Just a dream";
    const result = importCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries[0].title).toBe("");
    expect(result.entries[0].sleepQuality).toBe(5);
    expect(result.entries[0].lucidDream).toBe(false);
    expect(result.entries[0].emotions).toEqual([]);
    expect(result.entries[0].tags).toEqual([]);
  });
});
