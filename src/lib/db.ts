import Dexie, { type Table } from "dexie";

import { extractEntities, parseTags } from "@/lib/analysis";
import type { DraftEntry, Entry } from "@/types/journal";

class LucidLatticeDatabase extends Dexie {
  entries!: Table<Entry, number>;

  constructor() {
    super("lucid-lattice");
    this.version(1).stores({
      entries: "++id,type,createdAt,*tags",
    });
  }
}

export const db = new LucidLatticeDatabase();

export async function saveEntry(draft: DraftEntry): Promise<number> {
  const text = draft.editedTranscript || draft.transcript;
  const entry: Entry = {
    type: draft.type,
    createdAt: new Date().toISOString(),
    transcript: draft.transcript.trim(),
    editedTranscript: draft.editedTranscript.trim(),
    title: draft.title.trim(),
    tags: parseTags(draft.tagsInput),
    sleepQuality: draft.sleepQuality,
    lucidDream: draft.type === "dream" ? draft.lucidDream : false,
    nightmare: draft.type === "dream" ? draft.nightmare : false,
    recurringDream: draft.type === "dream" ? draft.recurringDream : false,
    emotions: draft.emotions,
    notes: draft.notes.trim(),
    extractedEntities: extractEntities(text),
  };

  return db.entries.add(entry);
}

export async function getEntries(): Promise<Entry[]> {
  return db.entries.orderBy("createdAt").reverse().toArray();
}

export async function clearEntries(): Promise<void> {
  await db.entries.clear();
}
