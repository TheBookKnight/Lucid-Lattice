import Dexie, { type Table } from "dexie";

import { extractEntities, parseTags } from "@/lib/analysis";
import type { DraftEntry, Entry } from "@/types/journal";

export interface AudioBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

class LucidLatticeDatabase extends Dexie {
  entries!: Table<Entry, number>;
  audioBlobs!: Table<AudioBlob, string>;

  constructor() {
    super("lucid-lattice");
    this.version(1).stores({
      entries: "++id,createdAt,*tags",
    });
    this.version(2).stores({
      entries: "++id,createdAt,*tags",
      audioBlobs: "id,createdAt",
    }).upgrade((tx) => {
      return tx.table("entries").toCollection().modify((entry) => {
        if (entry.isFavorite === undefined) {
          entry.isFavorite = false;
        }
      });
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
    isFavorite: false,
  };

  return db.entries.add(entry);
}

export async function getEntries(): Promise<Entry[]> {
  return db.entries.orderBy("createdAt").reverse().toArray();
}

export async function updateEntry(id: number, changes: Partial<Entry>): Promise<void> {
  await db.entries.update(id, changes);
}

export async function toggleFavorite(id: number): Promise<boolean> {
  const entry = await db.entries.get(id);
  if (!entry) return false;
  const newValue = !entry.isFavorite;
  await db.entries.update(id, { isFavorite: newValue });
  return newValue;
}

// Audio blob storage
export async function saveAudioBlob(id: string, blob: Blob, mimeType: string): Promise<void> {
  await db.audioBlobs.put({ id, blob, mimeType, createdAt: new Date().toISOString() });
}

export async function getAudioBlob(id: string): Promise<AudioBlob | undefined> {
  return db.audioBlobs.get(id);
}

export async function deleteAudioBlob(id: string): Promise<void> {
  await db.audioBlobs.delete(id);
}

export async function importEntries(entries: Entry[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (entry.isFavorite === undefined) {
      entry.isFavorite = false;
    }
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
  await db.audioBlobs.clear();
}
