import React, { useState, useRef, useEffect, useMemo } from "react";
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
  CheckCircle2,
  AlignLeft,
  Replace,
  Plus,
  Trash2,
  X,
  Undo2,
} from "lucide-react";
import {
  AudioFileItem,
  SummaryFormat,
  TranscriptSegment,
  UserSettings,
} from "../types";
import { formatTime } from "../utils/audioProcessor";
import { SummaryControlBar } from "./SummaryControlBar";
import { FindAndReplaceModal } from "./FindAndReplaceModal";
import { QuickRenameSpeakerModal } from "./QuickRenameSpeakerModal";

interface TranscriptViewerProps {
  item: AudioFileItem;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSegment: (
    segmentId: string,
    updated: Partial<TranscriptSegment>
  ) => void;
  onUpdateItem?: (updated: Partial<AudioFileItem>) => Promise<void>;
  onRenameSpeakerEverywhere?: (
    oldName: string,
    newName: string
  ) => Promise<void>;
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
  onUpdateItem,
  onRenameSpeakerEverywhere,
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
  const [internalTab, setInternalTab] = useState<"transcript" | "summary">(
    "transcript"
  );
  const currentTab = activeTab ?? internalTab;
  const handleTabChange = (tab: "transcript" | "summary") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Modals state
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [quickRenameSpeaker, setQuickRenameSpeaker] = useState<string | null>(
    null
  );

  // Segment editing state
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentSpeaker, setEditSegmentSpeaker] = useState("");
  const [initialSegmentSpeaker, setInitialSegmentSpeaker] = useState("");
  const [editSegmentText, setEditSegmentText] = useState("");
  const [editSegmentTranslation, setEditSegmentTranslation] = useState("");
  const [applySpeakerToAll, setApplySpeakerToAll] = useState(false);

  // Summary / Synthesis editing state
  const [activeSummaryView, setActiveSummaryView] = useState<
    "original" | "translated"
  >(item.translatedSummary ? "translated" : "original");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState("");
  const [editHighlights, setEditHighlights] = useState<string[]>([]);
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const [editTopics, setEditTopics] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState("");
  const [newActionInput, setNewActionInput] = useState("");
  const [newTopicInput, setNewTopicInput] = useState("");
  const [summarySavedNotification, setSummarySavedNotification] = useState(
    false
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

    const isTranslated = activeSummaryView === "translated";
    const highlightsToUse =
      isTranslated && item.translatedHighlights && item.translatedHighlights.length > 0
        ? item.translatedHighlights
        : item.highlights;
    const actionItemsToUse =
      isTranslated && item.translatedActionItems && item.translatedActionItems.length > 0
        ? item.translatedActionItems
        : item.actionItems;

    const sections: string[] = [summaryText];

    if (highlightsToUse && highlightsToUse.length > 0) {
      sections.push(
        "\n\nPoints essentiels :\n" +
          highlightsToUse.map((h) => `• ${h}`).join("\n")
      );
    }

    if (actionItemsToUse && actionItemsToUse.length > 0) {
      sections.push(
        "\n\nActions à retenir :\n" +
          actionItemsToUse.map((a) => `• ${a}`).join("\n")
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

  // Start editing a specific segment
  const handleStartEditSegment = (segment: TranscriptSegment) => {
    setEditingSegmentId(segment.id);
    setEditSegmentSpeaker(segment.speaker || "Intervenant");
    setInitialSegmentSpeaker(segment.speaker || "Intervenant");
    setEditSegmentText(segment.text || "");
    setEditSegmentTranslation(segment.translation || "");
    setApplySpeakerToAll(false);
  };

  // Save the edited segment
  const handleSaveSegment = async (segmentId: string) => {
    const trimmedSpeaker = editSegmentSpeaker.trim() || "Intervenant";
    onUpdateSegment(segmentId, {
      speaker: trimmedSpeaker,
      text: editSegmentText,
      translation: editSegmentTranslation.trim()
        ? editSegmentTranslation
        : undefined,
    });

    // If user checked "apply speaker to all" and changed the name
    if (
      applySpeakerToAll &&
      initialSegmentSpeaker.trim() &&
      trimmedSpeaker !== initialSegmentSpeaker.trim()
    ) {
      await onRenameSpeakerEverywhere?.(
        initialSegmentSpeaker.trim(),
        trimmedSpeaker
      );
    }

    setEditingSegmentId(null);
  };

  // Start editing the synthesis
  const handleStartEditSummary = () => {
    const isTranslated = activeSummaryView === "translated";
    const currentSummary =
      isTranslated && item.translatedSummary
        ? item.translatedSummary
        : item.summary || "";
    const currentHighlights =
      isTranslated && item.translatedHighlights && item.translatedHighlights.length > 0
        ? item.translatedHighlights
        : item.highlights || [];
    const currentActionItems =
      isTranslated && item.translatedActionItems && item.translatedActionItems.length > 0
        ? item.translatedActionItems
        : item.actionItems || [];

    setEditSummaryText(currentSummary);
    setEditHighlights([...currentHighlights]);
    setEditActionItems([...currentActionItems]);
    setEditTopics(item.topics ? [...item.topics] : []);
    setIsEditingSummary(true);
  };

  // Save the edited synthesis
  const handleSaveSummary = async () => {
    if (activeSummaryView === "translated") {
      await onUpdateItem?.({
        translatedSummary: editSummaryText,
        translatedHighlights: editHighlights,
        translatedActionItems: editActionItems,
        topics: editTopics,
      });
    } else {
      await onUpdateItem?.({
        summary: editSummaryText,
        highlights: editHighlights,
        actionItems: editActionItems,
        topics: editTopics,
      });
    }
    setIsEditingSummary(false);
    setSummarySavedNotification(true);
    setTimeout(() => setSummarySavedNotification(false), 2500);
  };

  // Count occurrences of a speaker for quick rename modal
  const speakerOccurrencesCount = useMemo(() => {
    if (!quickRenameSpeaker) return 0;
    return item.segments.filter((s) => s.speaker === quickRenameSpeaker).length;
  }, [quickRenameSpeaker, item.segments]);

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
            {item.isTranscriptImport && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {item.transcriptFormat || "Transcript importé"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center space-x-2">
            {item.isTranscriptImport ? (
              <>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Document importé
                </span>
                <span>•</span>
                <span>{item.segments.length} segments extraits</span>
                <span>•</span>
                <span>{item.fullText.split(/\s+/).filter(Boolean).length} mots</span>
              </>
            ) : (
              <>
                <span>{formatTime(item.duration)}</span>
                <span>•</span>
                <span>{item.segments.length} segments transcrits</span>
              </>
            )}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Find & Replace Button */}
          <button
            type="button"
            onClick={() => setIsFindReplaceOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
            title="Corriger un nom, un mot ou une faute dans tout le document"
          >
            <Replace className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Rechercher & Remplacer</span>
          </button>

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
          {currentTab === "transcript" &&
            (item.segments.some(
              (s) => s.translation && s.translation.trim().length > 0
            ) ? (
              <div className="flex items-center rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
                <button
                  onClick={() =>
                    onUpdateSettings({ translationViewMode: "split" })
                  }
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
            ))}

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
            <span>{item.isTranscriptImport ? "Transcription & Segments" : "Transcription & Lecteur audio"}</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {item.segments.length}
            </span>
          </button>
        </div>

        {/* Tab contextual description */}
        <div className="hidden md:flex items-center text-xs text-slate-400">
          {currentTab === "summary" ? (
            <span>Vue synthèse exécutive, points clés & actions (modifiable)</span>
          ) : (
            <span>Double-cliquez sur un texte ou un locuteur pour modifier</span>
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

            {/* Notification alert on save */}
            {summarySavedNotification && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-150">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Modifications de la synthèse enregistrées avec succès !</span>
              </div>
            )}

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
                            ? `Synthèse Traduite (${(
                                item.translatedSummaryLanguage || "Traduction"
                              ).toUpperCase()})`
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
                          ? `Traduit automatiquement en ${(
                              item.translatedSummaryLanguage || ""
                            ).toUpperCase()}`
                          : `Langue source : ${
                              item.detectedLanguage ||
                              item.sourceLanguage ||
                              "Détectée"
                            }`}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Edit & Copy */}
                  <div className="flex items-center space-x-2">
                    {/* Toggle Edit Mode button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingSummary) {
                          handleSaveSummary();
                        } else {
                          handleStartEditSummary();
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                      title={
                        isEditingSummary
                          ? "Enregistrer les modifications"
                          : "Modifier le texte ou les points de la synthèse"
                      }
                    >
                      {isEditingSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Enregistrer
                          </span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Modifier la synthèse</span>
                        </>
                      )}
                    </button>

                    {/* Single copy button: copies summary + highlights + actions */}
                    <button
                      type="button"
                      onClick={handleCopySummaryOnly}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      title="Copier le résumé, les points essentiels et les actions à retenir"
                    >
                      {summaryCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Copié !
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Copier la synthèse</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Synthesis Body: View Mode or Inline Edit Mode */}
                {isEditingSummary ? (
                  <div className="space-y-5 pt-1">
                    {/* Editable Summary Textarea */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Texte de la synthèse :
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Corrigez les noms, le texte ou les termes erronés
                        </span>
                      </div>
                      <textarea
                        value={editSummaryText}
                        onChange={(e) => setEditSummaryText(e.target.value)}
                        rows={7}
                        className="w-full text-sm sm:text-base leading-relaxed p-4 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-normal"
                        placeholder="Texte de la synthèse..."
                      />
                    </div>

                    {/* Editable Highlights */}
                    <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                      <span className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                        Points essentiels :
                      </span>
                      <div className="space-y-2">
                        {editHighlights.map((h, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <span className="text-indigo-500 font-bold text-sm">
                              •
                            </span>
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => {
                                const next = [...editHighlights];
                                next[i] = e.target.value;
                                setEditHighlights(next);
                              }}
                              className="flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditHighlights(
                                  editHighlights.filter((_, idx) => idx !== i)
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                              title="Supprimer ce point"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            value={newHighlightInput}
                            onChange={(e) =>
                              setNewHighlightInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                newHighlightInput.trim()
                              ) {
                                e.preventDefault();
                                setEditHighlights([
                                  ...editHighlights,
                                  newHighlightInput.trim(),
                                ]);
                                setNewHighlightInput("");
                              }
                            }}
                            placeholder="+ Ajouter un point essentiel (Appuyez sur Entrée)..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newHighlightInput.trim()) {
                                setEditHighlights([
                                  ...editHighlights,
                                  newHighlightInput.trim(),
                                ]);
                                setNewHighlightInput("");
                              }
                            }}
                            disabled={!newHighlightInput.trim()}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-semibold disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Editable Action items */}
                    <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                        Actions à retenir :
                      </span>
                      <div className="space-y-2">
                        {editActionItems.map((a, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <input
                              type="text"
                              value={a}
                              onChange={(e) => {
                                const next = [...editActionItems];
                                next[i] = e.target.value;
                                setEditActionItems(next);
                              }}
                              className="flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditActionItems(
                                  editActionItems.filter((_, idx) => idx !== i)
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                              title="Supprimer cette action"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            value={newActionInput}
                            onChange={(e) => setNewActionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newActionInput.trim()) {
                                e.preventDefault();
                                setEditActionItems([
                                  ...editActionItems,
                                  newActionInput.trim(),
                                ]);
                                setNewActionInput("");
                              }
                            }}
                            placeholder="+ Ajouter une action à retenir (Appuyez sur Entrée)..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newActionInput.trim()) {
                                setEditActionItems([
                                  ...editActionItems,
                                  newActionInput.trim(),
                                ]);
                                setNewActionInput("");
                              }
                            }}
                            disabled={!newActionInput.trim()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Save & Cancel Buttons */}
                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsEditingSummary(false)}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSummary}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Enregistrer les modifications</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Synthesis View */
                  <>
                    <div
                      onDoubleClick={handleStartEditSummary}
                      title="Double-cliquez pour modifier le texte de la synthèse"
                      className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 rounded-xl border border-slate-100 dark:border-slate-800 cursor-text select-text"
                    >
                      {activeSummaryView === "translated" &&
                      item.translatedSummary
                        ? item.translatedSummary
                        : item.summary}
                    </div>

                    {/* Highlights */}
                    {(() => {
                      const displayedHighlights =
                        activeSummaryView === "translated" &&
                        item.translatedHighlights &&
                        item.translatedHighlights.length > 0
                          ? item.translatedHighlights
                          : item.highlights;

                      if (!displayedHighlights || displayedHighlights.length === 0) {
                        return null;
                      }

                      return (
                        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                            {activeSummaryView === "translated"
                              ? "Points essentiels (traduits) :"
                              : "Points essentiels :"}
                          </span>
                          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {displayedHighlights.map((h, i) => (
                              <li key={i} className="leading-relaxed">
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}

                    {/* Action items */}
                    {(() => {
                      const displayedActionItems =
                        activeSummaryView === "translated" &&
                        item.translatedActionItems &&
                        item.translatedActionItems.length > 0
                          ? item.translatedActionItems
                          : item.actionItems;

                      if (!displayedActionItems || displayedActionItems.length === 0) {
                        return null;
                      }

                      return (
                        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                            {activeSummaryView === "translated"
                              ? "Actions à retenir (traduites) :"
                              : "Actions à retenir :"}
                          </span>
                          <div className="space-y-1.5">
                            {displayedActionItems.map((a, i) => (
                              <div
                                key={i}
                                className="flex items-start space-x-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Topics */}
                    {item.topics && item.topics.length > 0 && (
                      <div className="pt-2 flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">
                          Thèmes clés :
                        </span>
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
                  </>
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
                    Choisissez votre format ci-dessus (Détaillé, Léger, Points
                    clés, Compte-rendu) et lancez l'analyse IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onEnhanceWithAI(item.summaryFormat || "detailed")
                  }
                  disabled={isEnhancing}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isEnhancing
                      ? "Analyse en cours..."
                      : "Générer la synthèse maintenant"}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Transcription complète (Partie inférieure) */
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
                    onClick={() => {
                      if (!isEditing) {
                        onSeek(segment.start);
                      }
                    }}
                    onDoubleClick={() => {
                      if (!isEditing) {
                        handleStartEditSegment(segment);
                      }
                    }}
                    className={`rounded-2xl border p-4 transition-all relative ${
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
                              {formatTime(segment.start)} -{" "}
                              {formatTime(segment.end)}
                            </span>
                          </button>
                        )}

                        {/* Speaker label with quick rename everywhere */}
                        {settings.showSpeakers && (
                          <div className="flex items-center space-x-1 group">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickRenameSpeaker(
                                  segment.speaker || "Intervenant"
                                );
                              }}
                              className="flex items-center space-x-1 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                              title="Cliquer pour renommer cet intervenant sur l'ensemble de ses interventions"
                            >
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{segment.speaker || "Intervenant"}</span>
                              <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400 ml-1" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick actions: Copy & Edit */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(
                              `${segment.text}${
                                segment.translation
                                  ? ` (${segment.translation})`
                                  : ""
                              }`,
                              segment.id
                            );
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                            if (isEditing) {
                              setEditingSegmentId(null);
                            } else {
                              handleStartEditSegment(segment);
                            }
                          }}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                            isEditing
                              ? "bg-indigo-600 text-white"
                              : "text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          title="Modifier le texte ou l'intervenant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {isEditing ? "Fermer" : "Modifier"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Segment Body (Original & Translation) */}
                    {isEditing ? (
                      /* Inline Segment Editor */
                      <div
                        className="space-y-3 pt-2 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Speaker editing with global rename option */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Intervenant :</span>
                            </label>
                            <input
                              type="text"
                              value={editSegmentSpeaker}
                              onChange={(e) =>
                                setEditSegmentSpeaker(e.target.value)
                              }
                              className="w-48 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500"
                              placeholder="Nom de l'intervenant"
                            />
                          </div>

                          {initialSegmentSpeaker && (
                            <label className="flex items-center space-x-2 text-xs text-indigo-700 dark:text-indigo-300 cursor-pointer pt-0.5 select-none">
                              <input
                                type="checkbox"
                                checked={applySpeakerToAll}
                                onChange={(e) =>
                                  setApplySpeakerToAll(e.target.checked)
                                }
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>
                                Appliquer ce nom à toutes les interventions de "
                                {initialSegmentSpeaker}" (
                                {
                                  item.segments.filter(
                                    (s) => s.speaker === initialSegmentSpeaker
                                  ).length
                                }{" "}
                                segments)
                              </span>
                            </label>
                          )}
                        </div>

                        {/* Text editing */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Texte transcrit :
                          </label>
                          <textarea
                            value={editSegmentText}
                            onChange={(e) =>
                              setEditSegmentText(e.target.value)
                            }
                            rows={3}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed outline-hidden"
                            placeholder="Corriger le texte transcrit..."
                          />
                        </div>

                        {/* Translation editing if present */}
                        {segment.translation !== undefined && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                              <Languages className="w-3.5 h-3.5" />
                              <span>Traduction :</span>
                            </label>
                            <textarea
                              value={editSegmentTranslation}
                              onChange={(e) =>
                                setEditSegmentTranslation(e.target.value)
                              }
                              rows={2}
                              className="w-full text-sm p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed outline-hidden"
                              placeholder="Corriger la traduction..."
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSegmentId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSegment(segment.id)}
                            className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Enregistrer</span>
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

      {/* Find & Replace Modal */}
      <FindAndReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        item={item}
        onApply={async (updated) => {
          await onUpdateItem?.(updated);
        }}
      />

      {/* Quick Rename Speaker Modal */}
      {quickRenameSpeaker && (
        <QuickRenameSpeakerModal
          isOpen={Boolean(quickRenameSpeaker)}
          onClose={() => setQuickRenameSpeaker(null)}
          currentSpeaker={quickRenameSpeaker}
          occurrencesCount={speakerOccurrencesCount}
          onRename={async (oldName, newName) => {
            await onRenameSpeakerEverywhere?.(oldName, newName);
          }}
        />
      )}
    </div>
  );
};
