export const EMOTIONS = [
  "Joy",
  "Trust",
  "Fear",
  "Surprise",
  "Sadness",
  "Disgust",
  "Anger",
  "Anticipation",
] as const;

export const TIMEFRAMES = ["7d", "30d", "60d", "90d", "all"] as const;

export type Emotion = (typeof EMOTIONS)[number];
export type EntryType = "dream" | "waking_event";
export type Timeframe = (typeof TIMEFRAMES)[number];
export type EntityType = "person" | "place" | "noun";

export interface EmotionTag {
  emotion: Emotion;
  intensity: number;
  doubleValenced: boolean;
}

export interface ExtractedEntity {
  id: string;
  type: EntityType;
  value: string;
  normalizedValue: string;
  frequency: number;
}

export interface Entry {
  id?: number;
  type: EntryType;
  createdAt: string;
  transcript: string;
  editedTranscript: string;
  title: string;
  tags: string[];
  sleepQuality: number;
  lucidDream: boolean;
  nightmare: boolean;
  recurringDream: boolean;
  emotions: EmotionTag[];
  notes: string;
  extractedEntities: ExtractedEntity[];
}

export interface AnalysisMetric {
  label: string;
  count: number;
}

export interface AnalysisFilters {
  timeframe: Timeframe;
  emotion: Emotion | "all";
  minIntensity: number;
  entryType: EntryType | "all";
  lucidOnly: boolean;
  nightmareOnly: boolean;
  doubleValencedOnly: boolean;
}

export interface PhraseMetric extends AnalysisMetric {
  trend: "up" | "down" | "stable";
  lastSeen: string;
  topEmotion: string | null;
}

export interface AnalysisSnapshot {
  timeframe: Timeframe;
  totalEntries: number;
  topWords: AnalysisMetric[];
  topPhrases: PhraseMetric[];
  recurringEntities: Array<AnalysisMetric & { type: EntityType }>;
  emotionalTrends: Array<Record<string, number | string>>;
  correlations: AnalysisMetric[];
}

export interface DraftEntry {
  type: EntryType;
  transcript: string;
  editedTranscript: string;
  title: string;
  tagsInput: string;
  sleepQuality: number;
  lucidDream: boolean;
  nightmare: boolean;
  recurringDream: boolean;
  emotions: EmotionTag[];
  notes: string;
}
