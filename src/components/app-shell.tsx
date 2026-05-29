"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { EmotionPicker } from "@/components/emotion-picker";
import { clearEntries, getEntries, importEntries, saveEntry } from "@/lib/db";
import { emotionSummary, exportCSV, importCSV } from "@/lib/analysis";
import { useSpeechCapture } from "@/hooks/use-speech-capture";
import { useJournalStore } from "@/store/use-journal-store";
import { requestPersistence } from "@/lib/requestPersistentStorage";
import type { Entry } from "@/types/journal";

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function AppShell() {
  const draft = useJournalStore((state) => state.draft);
  const filters = useJournalStore((state) => state.filters);
  const updateDraft = useJournalStore((state) => state.updateDraft);
  const resetDraft = useJournalStore((state) => state.resetDraft);
  const updateFilters = useJournalStore((state) => state.updateFilters);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [persistenceHint, setPersistenceHint] = useState<string | null>(null);
  const speechBaseRef = useRef("");

  const refreshEntries = useCallback(async () => {
    const storedEntries = await getEntries();
    setEntries(storedEntries);
  }, []);

  useEffect(() => {
    refreshEntries().catch(() => undefined);
    requestPersistence().then((granted) => {
      if (!granted) {
        setPersistenceHint("Add Lucid Lattice to Home Screen for improved offline storage reliability.");
      }
    });
  }, [refreshEntries]);

  const onTranscript = useCallback(
    (transcript: string) => {
      const combinedTranscript = `${speechBaseRef.current} ${transcript}`.trim();
      updateDraft("transcript", combinedTranscript);
    },
    [updateDraft],
  );

  const { clearError, errorMessage, isListening, isSupported, start, stop } = useSpeechCapture(onTranscript);

  const saveDisabled = useMemo(
    () => !draft.title.trim() || !draft.transcript.trim() || draft.emotions.length === 0,
    [draft],
  );

  async function handleRecordToggle() {
    clearError();

    if (isListening) {
      await stop();
      return;
    }

    speechBaseRef.current = draft.transcript.trim();
    await start();
  }

  async function handleSave() {
    if (saveDisabled) {
      return;
    }

    setIsSaving(true);
    await saveEntry(draft);
    setSaveState("Dream saved offline.");
    resetDraft();
    await refreshEntries();
    setIsSaving(false);
  }

  async function handleDeleteAll() {
    if (!window.confirm("Delete all local entries from this device?")) {
      return;
    }

    await clearEntries();
    await refreshEntries();
    setSaveState("All local entries deleted.");
  }

  function handleExportCSV() {
    const csv = exportCSV(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lucid-lattice-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveState("Local data exported as CSV.");
  }

  async function handleShareCSV() {
    const csv = exportCSV(entries);
    const filename = `lucid-lattice-export-${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File([csv], filename, { type: "text/csv" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Lucid Lattice Export" });
        setSaveState("Shared successfully.");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSaveState("Share failed.");
        }
      }
    } else {
      // Fallback: mailto with text body
      const subject = encodeURIComponent("Lucid Lattice Dream Export");
      const body = encodeURIComponent(csv.slice(0, 2000));
      window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
      setSaveState("Opening email client...");
    }
  }

  async function handleImportCSV() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = importCSV(text);

        if (result.errors.length > 0 && result.entries.length === 0) {
          setSaveState(`Import failed: ${result.errors[0]}`);
          return;
        }

        const { imported, skipped } = await importEntries(result.entries);
        await refreshEntries();

        const messages: string[] = [`Imported ${imported} entries.`];
        if (skipped > 0) messages.push(`${skipped} duplicates skipped.`);
        if (result.errors.length > 0) messages.push(`${result.errors.length} rows had errors.`);
        setSaveState(messages.join(" "));
      } catch {
        setSaveState("Import failed: Could not read file.");
      }
    };
    input.click();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_rgba(9,9,11,0.9)_45%)] p-6 shadow-2xl shadow-fuchsia-950/30">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-zinc-300">
            Offline-first PWA
          </div>
          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Capture dreams before they fade.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Lucid Lattice is a privacy-first mobile journal designed for half-awake capture, emotion tagging, local pattern analysis,
              and reflective—not predictive—correlation review.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-zinc-200 sm:grid-cols-3">
            <div className="info-chip">Installable from Chrome and Safari home screens</div>
            <div className="info-chip">Works offline after the first visit</div>
            <div className="info-chip">No account, backend, ads, or tracking</div>
          </div>
        </div>
      </section>

      {persistenceHint ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {persistenceHint}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Quick capture</h2>
                <p className="text-sm text-zinc-400">One-handed, low-light journaling with manual fallback when speech is unavailable.</p>
              </div>
              <button type="button" onClick={handleRecordToggle} className="record-button">
                {isListening ? "Stop recording" : "Tap to speak"}
              </button>
            </div>

            <p className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
              {isSupported
                ? "Speech recognition uses the Web Speech API when available on this device."
                : "Speech recognition is unavailable here, so manual entry stays fully supported."}
            </p>
            {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
            {saveState ? <p className="text-sm text-emerald-300">{saveState}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Dream title</span>
              <input
                className="field"
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Flying over the ocean"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Tags</span>
              <input
                className="field"
                value={draft.tagsInput}
                onChange={(event) => updateDraft("tagsInput", event.target.value)}
                placeholder="water, train station, sibling"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-zinc-300">
            <span>Transcript</span>
            <textarea
              className="field min-h-36"
              value={draft.transcript}
              onChange={(event) => updateDraft("transcript", event.target.value)}
              placeholder="Describe the dream while it is fresh. This can be raw speech-to-text or manually corrected."
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            <span>Reflective notes</span>
            <textarea
              className="field min-h-24"
              value={draft.notes}
              onChange={(event) => updateDraft("notes", event.target.value)}
              placeholder="Entities, déjà vu feelings, symbolism, or contextual details."
            />
          </label>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-950/60 p-4">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Sleep quality ({draft.sleepQuality}/10)</span>
              <input
                type="range"
                min="1"
                max="10"
                value={draft.sleepQuality}
                onChange={(event) => updateDraft("sleepQuality", Number(event.target.value))}
                className="h-2 w-full accent-sky-400"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.lucidDream}
                  onChange={(event) => updateDraft("lucidDream", event.target.checked)}
                />
                Lucid dream
              </label>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.nightmare}
                  onChange={(event) => updateDraft("nightmare", event.target.checked)}
                />
                Nightmare
              </label>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={draft.recurringDream}
                  onChange={(event) => updateDraft("recurringDream", event.target.checked)}
                />
                Recurring
              </label>
            </div>
          </div>

          <EmotionPicker />

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleSave} disabled={isSaving || saveDisabled} className="primary-button">
              {isSaving ? "Saving…" : "Save dream entry"}
            </button>
            <button type="button" onClick={() => resetDraft()} className="secondary-button">
              Clear draft
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-white">Install help</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="rounded-2xl bg-zinc-950/60 p-4">
                <p className="font-medium text-white">Android / Chrome</p>
                <p className="mt-2">Open the app, tap the browser menu, and choose <strong>Install app</strong>.</p>
              </div>
              <div className="rounded-2xl bg-zinc-950/60 p-4">
                <p className="font-medium text-white">iPhone / Safari</p>
                <p className="mt-2">Open in Safari, use <strong>Share → Add to Home Screen</strong>, then launch fullscreen from your home screen.</p>
              </div>
              <p className="text-xs text-zinc-400">Installed PWAs receive stronger offline storage persistence.</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Local journal</h2>
                <p className="text-sm text-zinc-400">Stored with IndexedDB on this device.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
                {entries.length} entries
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handleExportCSV} disabled={entries.length === 0} className="secondary-button flex-1">
                Export CSV
              </button>
              <button type="button" onClick={handleShareCSV} disabled={entries.length === 0} className="secondary-button flex-1">
                Share
              </button>
              <button type="button" onClick={handleImportCSV} className="secondary-button flex-1">
                Import CSV
              </button>
              <button type="button" onClick={handleDeleteAll} disabled={entries.length === 0} className="secondary-button flex-1 text-rose-200">
                Delete local data
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {entries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 p-4 text-sm text-zinc-400">
                  Your saved entries will appear here for offline review.
                </p>
              ) : (
                entries.slice(0, 6).map((entry) => (
                  <article key={entry.id} className="rounded-2xl bg-zinc-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{entry.title || "Untitled dream"}</p>
                      </div>
                      <time className="text-xs text-zinc-500">{formatTimestamp(entry.createdAt)}</time>
                    </div>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-300">{entry.transcript}</p>
                    {entry.emotions.length > 0 ? (
                      <p className="mt-3 text-xs text-zinc-400">{emotionSummary(entry.emotions)}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>

      <AnalyticsDashboard entries={entries} filters={filters} onFilterChange={updateFilters} />

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-zinc-300 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Reflective framing</h2>
        <p className="mt-3">
          Lucid Lattice is built for exploratory dreamwork, autobiographical comparison, and personal pattern tracking. Any correlations shown here are reflective aids,
          not proof of precognition, certainty, or medical guidance.
        </p>
      </section>
    </main>
  );
}
