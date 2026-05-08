"use client";

import { EMOTIONS } from "@/types/journal";
import { useJournalStore } from "@/store/use-journal-store";

const emotionStyles: Record<(typeof EMOTIONS)[number], string> = {
  Joy: "border-amber-400/70 bg-amber-500/15 text-amber-100",
  Trust: "border-emerald-400/70 bg-emerald-500/15 text-emerald-100",
  Fear: "border-violet-400/70 bg-violet-500/15 text-violet-100",
  Surprise: "border-sky-400/70 bg-sky-500/15 text-sky-100",
  Sadness: "border-blue-400/70 bg-blue-500/15 text-blue-100",
  Disgust: "border-lime-400/70 bg-lime-500/15 text-lime-100",
  Anger: "border-rose-400/70 bg-rose-500/15 text-rose-100",
  Anticipation: "border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100",
};

export function EmotionPicker() {
  const draft = useJournalStore((state) => state.draft);
  const toggleEmotion = useJournalStore((state) => state.toggleEmotion);
  const setEmotionIntensity = useJournalStore((state) => state.setEmotionIntensity);
  const toggleDoubleValenced = useJournalStore((state) => state.toggleDoubleValenced);

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Emotion tags</h2>
        <p className="text-sm text-zinc-400">Select multiple emotions, track intensity, and flag mixed emotional states.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EMOTIONS.map((emotion) => {
          const selected = draft.emotions.some((item) => item.emotion === emotion);
          return (
            <button
              key={emotion}
              type="button"
              onClick={() => toggleEmotion(emotion)}
              className={`min-h-12 rounded-full border px-4 py-2 text-sm font-medium transition ${selected ? emotionStyles[emotion] : "border-white/10 bg-zinc-950/70 text-zinc-300"}`}
            >
              {emotion}
            </button>
          );
        })}
      </div>

      {draft.emotions.length > 0 ? (
        <div className="space-y-3">
          {draft.emotions.map((emotion) => (
            <div key={emotion.emotion} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{emotion.emotion}</p>
                  <p className="text-xs text-zinc-400">Intensity {emotion.intensity}/10</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900"
                    checked={emotion.doubleValenced}
                    onChange={() => toggleDoubleValenced(emotion.emotion)}
                  />
                  Double-valenced
                </label>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={emotion.intensity}
                onChange={(event) => setEmotionIntensity(emotion.emotion, Number(event.target.value))}
                className="mt-3 h-2 w-full accent-fuchsia-400"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
