import Dexie, { type Table } from "dexie";

import { extractEntities, parseTags } from "@/lib/analysis";
import type { DraftEntry, Entry } from "@/types/journal";

class LucidLatticeDatabase extends Dexie {
  entries!: Table<Entry, number>;

  constructor() {
    super("lucid-lattice");
    this.version(1).stores({
      entries: "++id,createdAt,*tags",
    });
  }
}

export const db = new LucidLatticeDatabase();

export async function saveEntry(draft: DraftEntry): Promise<number> {
  const text = draft.transcript;
  const entry: Entry = {
    createdAt: new Date().toISOString(),
    transcript: draft.transcript.trim(),
    title: draft.title.trim(),
    tags: parseTags(draft.tagsInput),
    sleepQuality: draft.sleepQuality,
    lucidDream: draft.lucidDream,
    nightmare: draft.nightmare,
    recurringDream: draft.recurringDream,
    emotions: draft.emotions,
    notes: draft.notes.trim(),
    extractedEntities: extractEntities(text),
  };

  return db.entries.add(entry);
}

export async function getEntries(): Promise<Entry[]> {
  return db.entries.orderBy("createdAt").reverse().toArray();
}

export async function importEntries(entries: Entry[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (entry.id) {
      const existing = await db.entries.get(entry.id);
      if (existing) {
        skipped++;
        continue;
      }
      await db.entries.put(entry);
    } else {
      // Check for duplicate by createdAt + transcript
      const existing = await db.entries
        .where("createdAt")
        .equals(entry.createdAt)
        .filter((e) => e.transcript === entry.transcript)
        .first();
      if (existing) {
        skipped++;
        continue;
      }
      await db.entries.add(entry);
    }
    imported++;
  }

  return { imported, skipped };
}

export async function clearEntries(): Promise<void> {
  await db.entries.clear();
}
