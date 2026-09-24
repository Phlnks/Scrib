export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
  translation?: string;
}

export type SummaryFormat = "concise" | "detailed" | "bullet_points" | "meeting_minutes";

export interface FolderItem {
  id: string;
  name: string;
  color?: string; // e.g. "indigo" | "emerald" | "amber" | "rose" | "purple" | "blue"
  createdAt: string;
}

export interface AudioFileItem {
  id: string;
  name: string;
  fileSize: number;
  fileType: string;
  duration: number; // in seconds
  createdAt: string;
  folderId?: string; // Optional folder / category ID
  status: "idle" | "chunking" | "processing" | "completed" | "error";
  progress: number; // 0 to 100
  progressMessage?: string;
  currentChunk?: number;
  totalChunks?: number;
  error?: string;
  segments: TranscriptSegment[];
  fullText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage?: string;
  summary?: string;
  summaryFormat?: SummaryFormat;
  summaryLanguage?: string;
  translatedSummary?: string;
  translatedSummaryLanguage?: string;
  translatedHighlights?: string[];
  translatedActionItems?: string[];
  highlights?: string[];
  actionItems?: string[];
  topics?: string[];
  isTranscriptImport?: boolean;
  transcriptFormat?: string;
}

export interface UserSettings {
  theme: "light" | "dark";
  fontSize: "sm" | "base" | "lg" | "xl";
  showTimestamps: boolean;
  showSpeakers: boolean;
  showTranslation: boolean;
  translationViewMode: "split" | "original" | "translated";
  chunkDurationMinutes: number; // e.g. 5 minutes
  aiEnhancement: boolean;
  autoScroll: boolean;
  defaultTargetLang: "fr" | "en" | "es" | "de" | "none";
}

export interface AudioChunk {
  index: number;
  total: number;
  startTime: number;
  endTime: number;
  blob: Blob;
  base64: string;
  mimeType: string;
}
