import { describe, expect, it } from "vitest";

import { buildAnalysis, createEmptyDraft, extractEntities, filterEntries, tokenizeText } from "@/lib/analysis";
import type { Entry } from "@/types/journal";

const baseEntry: Entry = {
  id: 1,
  type: "dream",
  createdAt: new Date().toISOString(),
  transcript: "I saw a silver wolf near the river with Morgan.",
  editedTranscript: "I saw a silver wolf near the river with Morgan.",
  title: "Silver wolf",
  tags: ["wolf", "river"],
  sleepQuality: 7,
  lucidDream: true,
  nightmare: false,
  recurringDream: true,
  emotions: [
    { emotion: "Fear", intensity: 7, doubleValenced: true },
    { emotion: "Anticipation", intensity: 6, doubleValenced: true },
  ],
  notes: "Morgan was calm.",
  extractedEntities: extractEntities("Morgan stood near the river with a silver wolf."),
};

describe("analysis helpers", () => {
  it("creates a clean default draft", () => {
    expect(createEmptyDraft()).toMatchObject({
      type: "dream",
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
        type: "waking_event",
        lucidDream: false,
        recurringDream: false,
        emotions: [{ emotion: "Joy", intensity: 5, doubleValenced: false }],
      },
    ];

    expect(
      filterEntries(entries, {
        timeframe: "all",
        emotion: "Fear",
        minIntensity: 6,
        entryType: "dream",
        lucidOnly: true,
        nightmareOnly: false,
        doubleValencedOnly: true,
      }),
    ).toHaveLength(1);
  });

  it("builds word and emotion analytics", () => {
    const snapshot = buildAnalysis([baseEntry], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      entryType: "all",
      lucidOnly: false,
      nightmareOnly: false,
      doubleValencedOnly: false,
    });

    expect(snapshot.totalEntries).toBe(1);
    expect(snapshot.topWords.some((item) => item.label === "silver")).toBe(true);
    expect(snapshot.correlations.some((item) => item.label === "Fear")).toBe(true);
  });
});
