import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Clock,
  User,
  Languages,
  Sparkles,
  Download,
  Check,
  Edit2,
  Copy,
  ChevronDown,
  ChevronUp,
  SplitSquareVertical,
  Volume2,
  ListFilter,
  CheckCircle2,
  AlignLeft,
  Globe,
} from "lucide-react";
import { AudioFileItem, SummaryFormat, TranscriptSegment, UserSettings } from "../types";
import { formatTime } from "../utils/audioProcessor";
import { SummaryControlBar } from "./SummaryControlBar";

interface TranscriptViewerProps {
  item: AudioFileItem;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSegment: (segmentId: string, updated: Partial<TranscriptSegment>) => void;
  onOpenExport: () => void;
  onEnhanceWithAI: (format?: SummaryFormat) => Promise<void>;
  onTranslateSummary?: (targetLang: string) => Promise<void>;
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  isEnhancing?: boolean;
  isTranslatingSummary?: boolean;
  activeTab?: "transcript" | "summary";
  onTabChange?: (tab: "transcript" | "summary") => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  item,
  currentTime,
  onSeek,
  onUpdateSegment,
  onOpenExport,
  onEnhanceWithAI,
  onTranslateSummary,
  settings,
  onUpdateSettings,
  isEnhancing = false,
  isTranslatingSummary = false,
  activeTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<"transcript" | "summary">("transcript");
  const currentTab = activeTab ?? internalTab;
  const handleTabChange = (tab: "transcript" | "summary") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [activeSummaryView, setActiveSummaryView] = useState<"original" | "translated">(
    item.translatedSummary ? "translated" : "original"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Sync activeSummaryView when a new translation arrives
  useEffect(() => {
    if (item.translatedSummary) {
      setActiveSummaryView("translated");
    }
  }, [item.translatedSummary, item.translatedSummaryLanguage]);

  // Copy complete synthesis in one click (summary + highlights + action items)
  const handleCopySummaryOnly = async () => {
    const summaryText =
      activeSummaryView === "translated" && item.translatedSummary
        ? item.translatedSummary
        : item.summary;
    if (!summaryText) return;

    const sections: string[] = [summaryText];

    if (item.highlights && item.highlights.length > 0) {
      sections.push(
        "\n\nPoints essentiels :\n" +
          item.highlights.map((h) => `• ${h}`).join("\n")
      );
    }

    if (item.actionItems && item.actionItems.length > 0) {
      sections.push(
        "\n\nActions à retenir :\n" +
          item.actionItems.map((a) => `• ${a}`).join("\n")
      );
    }

    const fullContent = sections.join("");

    try {
      await navigator.clipboard.writeText(fullContent);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy error:", err);
    }
  };

  // Find active segment based on audio currentTime
  const activeSegment = item.segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Auto scroll to active segment if setting is on
  useEffect(() => {
    if (settings.autoScroll && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegment?.id, settings.autoScroll]);

  // All segments are directly rendered (native browser Ctrl+F search handles in-page searching)
  const segments = item.segments;

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case "sm":
        return "text-xs leading-relaxed";
      case "lg":
        return "text-base leading-relaxed";
      case "xl":
        return "text-lg leading-relaxed";
      case "base":
      default:
        return "text-sm leading-relaxed";
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* Top Action Toolbar */}
      <div className="shrink-0 p-4 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Title and metadata */}
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-md">
              {item.name}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {item.detectedLanguage || item.sourceLanguage || "Audio"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center space-x-2">
            <span>{formatTime(item.duration)}</span>
            <span>•</span>
            <span>{item.segments.length} segments transcrits</span>
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* AI Enhance / Summary Button (visible on summary tab or when needed) */}
          {currentTab === "summary" && (
            <button
              onClick={() => onEnhanceWithAI(item.summaryFormat || "detailed")}
              disabled={isEnhancing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isEnhancing
                  ? "Analyse IA..."
                  : item.summary
                  ? "Actualiser Synthèse IA"
                  : "Générer Synthèse IA"}
              </span>
            </button>
          )}

          {/* View mode toggle: Split vs Original vs Translation (on transcript tab if translations exist) */}
          {currentTab === "transcript" && (
            item.segments.some((s) => s.translation && s.translation.trim().length > 0) ? (
              <div className="flex items-center rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                <button
                  onClick={() => onUpdateSettings({ translationViewMode: "split" })}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    settings.translationViewMode === "split"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Bilingue
                </button>
                <button
                  onClick={() =>
                    onUpdateSettings({ translationViewMode: "original" })
                  }
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    settings.translationViewMode === "original"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() =>
                    onUpdateSettings({ translationViewMode: "translated" })
                  }
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    settings.translationViewMode === "translated"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Traduit
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Languages className="w-3.5 h-3.5 text-indigo-500" />
                <span>Langue : {item.detectedLanguage || "Originale"}</span>
              </div>
            )
          )}

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter (PDF / TXT)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Tab 1: Résumé & Synthèse */}
          <button
            type="button"
            onClick={() => handleTabChange("summary")}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 text-xs sm:text-sm transition-all cursor-pointer ${
              currentTab === "summary"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Résumé & Synthèse</span>
            {item.summary ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
                Prêt
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                À générer
              </span>
            )}
          </button>

          {/* Tab 2: Transcription avec lecteur audio */}
          <button
            type="button"
            onClick={() => handleTabChange("transcript")}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 text-xs sm:text-sm transition-all cursor-pointer ${
              currentTab === "transcript"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>Transcription & Lecteur audio</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {item.segments.length}
            </span>
          </button>
        </div>

        {/* Tab contextual description */}
        <div className="hidden md:flex items-center text-xs text-slate-400">
          {currentTab === "summary" ? (
            <span>Vue synthèse exécutive, points clés & actions</span>
          ) : (
            <span>Lecteur audio synchronisé au bas de l'écran</span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        {currentTab === "summary" ? (
          /* TAB 1: Résumé & Synthèse */
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Summary Control Bar (Format selection & Translation triggers) */}
            <SummaryControlBar
              currentFormat={item.summaryFormat || "detailed"}
              onGenerateSummary={(format) => onEnhanceWithAI(format)}
              onTranslateSummary={async (targetLang) => {
                if (onTranslateSummary) {
                  await onTranslateSummary(targetLang);
                }
              }}
              isGenerating={isEnhancing}
              isTranslating={isTranslatingSummary}
              translatedLanguage={item.translatedSummaryLanguage}
              hasSummary={Boolean(item.summary)}
              activeSummaryView={activeSummaryView}
              setActiveSummaryView={setActiveSummaryView}
              detectedLanguage={item.detectedLanguage}
            />

            {/* Executive Summary Card or Empty State */}
            {item.summary ? (
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6 space-y-5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>
                          {activeSummaryView === "translated"
                            ? `Synthèse Traduite (${(item.translatedSummaryLanguage || "Traduction").toUpperCase()})`
                            : "Synthèse Exécutive & Points Clés"}
                        </span>
                        <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {item.summaryFormat === "concise"
                            ? "Format Léger"
                            : item.summaryFormat === "bullet_points"
                            ? "Format Points clés"
                            : item.summaryFormat === "meeting_minutes"
                            ? "Format Compte-rendu"
                            : "Format Détaillé"}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activeSummaryView === "translated"
                          ? `Traduit automatiquement en ${(item.translatedSummaryLanguage || "").toUpperCase()}`
                          : `Langue source : ${item.detectedLanguage || item.sourceLanguage || "Détectée"}`}
                      </p>
                    </div>
                  </div>

                  {/* Single copy button: copies summary + highlights + actions */}
                  <button
                    type="button"
                    onClick={handleCopySummaryOnly}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="Copier le résumé, les points essentiels et les actions à retenir"
                  >
                    {summaryCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Copier la synthèse</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Synthesis Text Body */}
                <div className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {activeSummaryView === "translated" && item.translatedSummary
                    ? item.translatedSummary
                    : item.summary}
                </div>

                {/* Highlights */}
                {item.highlights && item.highlights.length > 0 && (
                  <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                      Points essentiels :
                    </span>
                    <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="leading-relaxed">{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action items */}
                {item.actionItems && item.actionItems.length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                      Actions à retenir :
                    </span>
                    <div className="space-y-1.5">
                      {item.actionItems.map((a, i) => (
                        <div key={i} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {item.topics && item.topics.length > 0 && (
                  <div className="pt-2 flex items-center space-x-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">Thèmes clés :</span>
                    {item.topics.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center bg-white/50 dark:bg-slate-900/50 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    Aucune synthèse générée pour cet enregistrement
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Choisissez votre format ci-dessus (Détaillé, Léger, Points clés, Compte-rendu) et lancez l'analyse IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEnhanceWithAI(item.summaryFormat || "detailed")}
                  disabled={isEnhancing}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isEnhancing ? "Analyse en cours..." : "Générer la synthèse maintenant"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Transcription complète */
          <div className="space-y-3 max-w-5xl mx-auto">
          {segments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Aucun segment trouvé.
            </div>
          ) : (
            segments.map((segment) => {
              const isActive = activeSegment?.id === segment.id;
              const isEditing = editingSegmentId === segment.id;

              return (
                <div
                  key={segment.id}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => onSeek(segment.start)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer relative ${
                    isActive
                      ? "border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Segment Header */}
                  <div className="flex items-center justify-between pb-2 text-xs">
                    <div className="flex items-center space-x-2.5">
                      {/* Timestamp button */}
                      {settings.showTimestamps && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(segment.start);
                          }}
                          className={`flex items-center space-x-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-colors ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600"
                          }`}
                          title="Cliquer pour écouter ce passage"
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                        </button>
                      )}

                      {/* Speaker label */}
                      {settings.showSpeakers && (
                        <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{segment.speaker || "Intervenant"}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick actions: Copy & Edit */}
                    <div className="flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyText(
                            `${segment.text}${
                              segment.translation ? ` (${segment.translation})` : ""
                            }`,
                            segment.id
                          );
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Copier ce passage"
                      >
                        {copiedId === segment.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSegmentId(
                            isEditing ? null : segment.id
                          );
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Éditer le texte ou le locuteur"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Segment Body (Original & Translation) */}
                  {isEditing ? (
                    <div
                      className="space-y-3 pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={segment.speaker}
                          onChange={(e) =>
                            onUpdateSegment(segment.id, {
                              speaker: e.target.value,
                            })
                          }
                          className="w-40 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Nom de l'interlocuteur"
                        />
                      </div>
                      <textarea
                        value={segment.text}
                        onChange={(e) =>
                          onUpdateSegment(segment.id, {
                            text: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        placeholder="Texte original..."
                      />
                      {segment.translation !== undefined && (
                        <textarea
                          value={segment.translation}
                          onChange={(e) =>
                            onUpdateSegment(segment.id, {
                              translation: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full text-sm p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Traduction..."
                        />
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingSegmentId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : settings.translationViewMode === "split" &&
                    segment.translation ? (
                    /* Side-by-Side Dual View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Original */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Original ({item.detectedLanguage || "Audio"})
                        </span>
                        <p
                          className={`${getFontSizeClass()} text-slate-900 dark:text-slate-100 font-normal`}
                        >
                          {segment.text}
                        </p>
                      </div>

                      {/* Translation */}
                      <div className="space-y-1 md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                          <Languages className="w-3 h-3" />
                          <span>Traduction</span>
                        </span>
                        <p
                          className={`${getFontSizeClass()} text-indigo-950 dark:text-indigo-200 font-normal`}
                        >
                          {segment.translation}
                        </p>
                      </div>
                    </div>
                  ) : settings.translationViewMode === "translated" &&
                    segment.translation ? (
                    /* Translated Only */
                    <p
                      className={`${getFontSizeClass()} text-indigo-950 dark:text-indigo-200 font-normal pt-1`}
                    >
                      {segment.translation}
                    </p>
                  ) : (
                    /* Original Only or Default */
                    <div className="space-y-1.5 pt-1">
                      <p
                        className={`${getFontSizeClass()} text-slate-900 dark:text-slate-100 font-normal`}
                      >
                        {segment.text}
                      </p>
                      {segment.translation && (
                        <p
                          className={`text-xs text-indigo-700 dark:text-indigo-300 italic pt-0.5 border-t border-indigo-100 dark:border-indigo-900/40`}
                        >
                          ↳ {segment.translation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  </div>
);
};
