import { describe, expect, it } from "vitest";

import { filterEntries, extractEntities } from "@/lib/analysis";
import type { Entry } from "@/types/journal";

const baseEntry: Entry = {
  id: 1,
  createdAt: new Date().toISOString(),
  transcript: "A dream about flying.",
  title: "Flying",
  tags: ["flying"],
  sleepQuality: 7,
  lucidDream: false,
  nightmare: false,
  recurringDream: false,
  emotions: [{ emotion: "Joy", intensity: 8 }],
  notes: "",
  extractedEntities: extractEntities("flying"),
  isFavorite: false,
};

const favoriteEntry: Entry = {
  ...baseEntry,
  id: 2,
  title: "Favorite dream",
  isFavorite: true,
};

describe("favorites filtering", () => {
  it("returns all entries when favoritesOnly is false", () => {
    const result = filterEntries([baseEntry, favoriteEntry], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      lucidOnly: false,
      nightmareOnly: false,
      favoritesOnly: false,
    });
    expect(result).toHaveLength(2);
  });

  it("returns only favorites when favoritesOnly is true", () => {
    const result = filterEntries([baseEntry, favoriteEntry], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      lucidOnly: false,
      nightmareOnly: false,
      favoritesOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].isFavorite).toBe(true);
  });

  it("combines favorites filter with other filters", () => {
    const lucidFavorite: Entry = {
      ...favoriteEntry,
      id: 3,
      lucidDream: true,
    };
    const result = filterEntries([baseEntry, favoriteEntry, lucidFavorite], {
      timeframe: "all",
      emotion: "all",
      minIntensity: 1,
      lucidOnly: true,
      nightmareOnly: false,
      favoritesOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});
