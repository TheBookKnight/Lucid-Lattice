"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildAnalysis } from "@/lib/analysis";
import { TIMEFRAMES, type AnalysisFilters, type Entry } from "@/types/journal";

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950/50 p-5 text-sm text-zinc-400">
      Save a few entries to unlock local pattern analysis, entity recurrence, and emotional trends.
    </div>
  );
}

export function AnalyticsDashboard({
  entries,
  filters,
  onFilterChange,
}: {
  entries: Entry[];
  filters: AnalysisFilters;
  onFilterChange: <Key extends keyof AnalysisFilters>(field: Key, value: AnalysisFilters[Key]) => void;
}) {
  const snapshot = buildAnalysis(entries, filters);

  return (
    <section className="space-y-5 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Pattern dashboard</h2>
        <p className="text-sm text-zinc-400">Local-only analytics for recurring words, entities, and emotion trends.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-zinc-300">
          <span>Timeframe</span>
          <select
            value={filters.timeframe}
            onChange={(event) => onFilterChange("timeframe", event.target.value as AnalysisFilters["timeframe"])}
            className="field"
          >
            {TIMEFRAMES.map((timeframe) => (
              <option key={timeframe} value={timeframe}>
                {timeframe === "all" ? "All time" : timeframe.replace("d", " days")}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-zinc-300">
          <span>Entry type</span>
          <select
            value={filters.entryType}
            onChange={(event) => onFilterChange("entryType", event.target.value as AnalysisFilters["entryType"])}
            className="field"
          >
            <option value="all">Dreams + waking experiences</option>
            <option value="dream">Dreams only</option>
            <option value="waking_event">Waking events only</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-zinc-300">
          <span>Emotion filter</span>
          <select
            value={filters.emotion}
            onChange={(event) => onFilterChange("emotion", event.target.value as AnalysisFilters["emotion"])}
            className="field"
          >
            <option value="all">All emotions</option>
            <option value="Joy">Joy</option>
            <option value="Trust">Trust</option>
            <option value="Fear">Fear</option>
            <option value="Surprise">Surprise</option>
            <option value="Sadness">Sadness</option>
            <option value="Disgust">Disgust</option>
            <option value="Anger">Anger</option>
            <option value="Anticipation">Anticipation</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-zinc-300">
          <span>Minimum intensity ({filters.minIntensity})</span>
          <input
            type="range"
            min="1"
            max="10"
            value={filters.minIntensity}
            onChange={(event) => onFilterChange("minIntensity", Number(event.target.value))}
            className="h-2 w-full accent-fuchsia-400"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.lucidOnly}
            onChange={(event) => onFilterChange("lucidOnly", event.target.checked)}
          />
          Lucid only
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.nightmareOnly}
            onChange={(event) => onFilterChange("nightmareOnly", event.target.checked)}
          />
          Nightmare only
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.doubleValencedOnly}
            onChange={(event) => onFilterChange("doubleValencedOnly", event.target.checked)}
          />
          Mixed emotions only
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Entries</span>
          <strong className="mt-2 text-3xl text-white">{snapshot.totalEntries}</strong>
        </div>
        <div className="stat-card">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Top emotion</span>
          <strong className="mt-2 text-2xl text-white">{snapshot.correlations[0]?.label ?? "N/A"}</strong>
        </div>
        <div className="stat-card">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Top word</span>
          <strong className="mt-2 text-2xl text-white">{snapshot.topWords[0]?.label ?? "N/A"}</strong>
        </div>
      </div>

      {snapshot.totalEntries === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="chart-card">
            <h3 className="chart-title">Recurring words</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={snapshot.topWords} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={9999} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Emotional trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={snapshot.emotionalTrends} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Joy" stroke="#fbbf24" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Fear" stroke="#a855f7" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Sadness" stroke="#60a5fa" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card lg:col-span-2">
            <h3 className="chart-title">Recurring entities & correlations</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ul className="space-y-3 text-sm text-zinc-300">
                {snapshot.recurringEntities.map((entity) => (
                  <li key={`${entity.type}-${entity.label}`} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/70 px-4 py-3">
                    <span>
                      <span className="font-medium text-white">{entity.label}</span>
                      <span className="ml-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{entity.type}</span>
                    </span>
                    <span className="text-zinc-400">{entity.count}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3 text-sm text-zinc-300">
                {snapshot.correlations.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/70 px-4 py-3">
                    <span className="font-medium text-white">{item.label}</span>
                    <span className="text-zinc-400">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
