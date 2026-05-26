import { create } from "zustand";

import { createEmptyDraft, defaultFilters } from "@/lib/analysis";
import type { AnalysisFilters, DraftEntry, Emotion } from "@/types/journal";

type JournalStore = {
  draft: DraftEntry;
  filters: AnalysisFilters;
  updateDraft: <Key extends keyof DraftEntry>(field: Key, value: DraftEntry[Key]) => void;
  toggleEmotion: (emotion: Emotion) => void;
  setEmotionIntensity: (emotion: Emotion, intensity: number) => void;
  resetDraft: () => void;
  updateFilters: <Key extends keyof AnalysisFilters>(field: Key, value: AnalysisFilters[Key]) => void;
};

export const useJournalStore = create<JournalStore>((set) => ({
  draft: createEmptyDraft(),
  filters: defaultFilters,
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
            : [...state.draft.emotions, { emotion, intensity: 5 }],
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
  resetDraft: () => set({ draft: createEmptyDraft() }),
  updateFilters: (field, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [field]: value,
      },
    })),
}));
