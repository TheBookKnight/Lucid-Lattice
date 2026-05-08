import { create } from "zustand";

import { createEmptyDraft, defaultFilters } from "@/lib/analysis";
import type { AnalysisFilters, DraftEntry, Emotion, EntryType } from "@/types/journal";

type JournalStore = {
  draft: DraftEntry;
  filters: AnalysisFilters;
  setType: (type: EntryType) => void;
  updateDraft: <Key extends keyof DraftEntry>(field: Key, value: DraftEntry[Key]) => void;
  toggleEmotion: (emotion: Emotion) => void;
  setEmotionIntensity: (emotion: Emotion, intensity: number) => void;
  toggleDoubleValenced: (emotion: Emotion) => void;
  resetDraft: (type?: EntryType) => void;
  updateFilters: <Key extends keyof AnalysisFilters>(field: Key, value: AnalysisFilters[Key]) => void;
};

export const useJournalStore = create<JournalStore>((set) => ({
  draft: createEmptyDraft(),
  filters: defaultFilters,
  setType: (type) =>
    set((state) => ({
      draft: {
        ...createEmptyDraft(type),
        transcript: state.draft.transcript,
        editedTranscript: state.draft.editedTranscript,
        emotions: state.draft.emotions,
        notes: state.draft.notes,
      },
    })),
  updateDraft: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    })),
  toggleEmotion: (emotion) =>
    set((state) => {
      const existing = state.draft.emotions.find((item) => item.emotion === emotion);

      return {
        draft: {
          ...state.draft,
          emotions: existing
            ? state.draft.emotions.filter((item) => item.emotion !== emotion)
            : [...state.draft.emotions, { emotion, intensity: 5, doubleValenced: false }],
        },
      };
    }),
  setEmotionIntensity: (emotion, intensity) =>
    set((state) => ({
      draft: {
        ...state.draft,
        emotions: state.draft.emotions.map((item) =>
          item.emotion === emotion ? { ...item, intensity } : item,
        ),
      },
    })),
  toggleDoubleValenced: (emotion) =>
    set((state) => ({
      draft: {
        ...state.draft,
        emotions: state.draft.emotions.map((item) =>
          item.emotion === emotion ? { ...item, doubleValenced: !item.doubleValenced } : item,
        ),
      },
    })),
  resetDraft: (type = "dream") => set({ draft: createEmptyDraft(type) }),
  updateFilters: (field, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [field]: value,
      },
    })),
}));
