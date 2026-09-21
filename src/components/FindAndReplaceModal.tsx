import React, { useState, useMemo } from "react";
import {
  X,
  Replace,
  Check,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Users,
  AlignLeft,
} from "lucide-react";
import { AudioFileItem, TranscriptSegment } from "../types";

interface FindAndReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AudioFileItem;
  onApply: (updated: Partial<AudioFileItem>) => Promise<void>;
}

export const FindAndReplaceModal: React.FC<FindAndReplaceModalProps> = ({
  isOpen,
  onClose,
  item,
  onApply,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const [scopeTranscript, setScopeTranscript] = useState(true);
  const [scopeSpeakers, setScopeSpeakers] = useState(true);
  const [scopeSummary, setScopeSummary] = useState(true);

  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper regex constructor
  const searchRegex = useMemo(() => {
    if (!searchTerm.trim()) return null;
    try {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
      return new RegExp(pattern, matchCase ? "g" : "gi");
    } catch {
      return null;
    }
  }, [searchTerm, matchCase, wholeWord]);

  // Calculate occurrences count live
  const matchCounts = useMemo(() => {
    if (!searchRegex) {
      return { transcript: 0, speakers: 0, summary: 0, total: 0 };
    }

    let transcriptCount = 0;
    let speakersCount = 0;
    let summaryCount = 0;

    // Count in segments (text + translation)
    for (const seg of item.segments) {
      const matchText = seg.text.match(searchRegex);
      if (matchText) transcriptCount += matchText.length;

      if (seg.translation) {
        const matchTr = seg.translation.match(searchRegex);
        if (matchTr) transcriptCount += matchTr.length;
      }

      if (seg.speaker) {
        const matchSpk = seg.speaker.match(searchRegex);
        if (matchSpk) speakersCount += matchSpk.length;
      }
    }

    // Count in summary & highlights
    if (item.summary) {
      const matchSum = item.summary.match(searchRegex);
      if (matchSum) summaryCount += matchSum.length;
    }
    if (item.translatedSummary) {
      const matchTrSum = item.translatedSummary.match(searchRegex);
      if (matchTrSum) summaryCount += matchTrSum.length;
    }
    if (item.highlights) {
      for (const h of item.highlights) {
        const m = h.match(searchRegex);
        if (m) summaryCount += m.length;
      }
    }
    if (item.actionItems) {
      for (const a of item.actionItems) {
        const m = a.match(searchRegex);
        if (m) summaryCount += m.length;
      }
    }
    if (item.translatedHighlights) {
      for (const h of item.translatedHighlights) {
        const m = h.match(searchRegex);
        if (m) summaryCount += m.length;
      }
    }
    if (item.translatedActionItems) {
      for (const a of item.translatedActionItems) {
        const m = a.match(searchRegex);
        if (m) summaryCount += m.length;
      }
    }

    const total =
      (scopeTranscript ? transcriptCount : 0) +
      (scopeSpeakers ? speakersCount : 0) +
      (scopeSummary ? summaryCount : 0);

    return {
      transcript: transcriptCount,
      speakers: speakersCount,
      summary: summaryCount,
      total,
    };
  }, [searchRegex, item, scopeTranscript, scopeSpeakers, scopeSummary]);

  if (!isOpen) return null;

  const handleExecuteReplace = async () => {
    if (!searchRegex || matchCounts.total === 0) return;
    setIsApplying(true);

    try {
      let updatedSegments: TranscriptSegment[] = [...item.segments];
      let updatedSummary = item.summary;
      let updatedTranslatedSummary = item.translatedSummary;
      let updatedHighlights = item.highlights ? [...item.highlights] : undefined;
      let updatedActionItems = item.actionItems
        ? [...item.actionItems]
        : undefined;
      let updatedTranslatedHighlights = item.translatedHighlights
        ? [...item.translatedHighlights]
        : undefined;
      let updatedTranslatedActionItems = item.translatedActionItems
        ? [...item.translatedActionItems]
        : undefined;

      // Replace in segments
      if (scopeTranscript || scopeSpeakers) {
        updatedSegments = updatedSegments.map((seg) => {
          let text = seg.text;
          let translation = seg.translation;
          let speaker = seg.speaker;

          if (scopeTranscript) {
            text = text.replace(searchRegex, replaceTerm);
            if (translation) {
              translation = translation.replace(searchRegex, replaceTerm);
            }
          }

          if (scopeSpeakers && speaker) {
            speaker = speaker.replace(searchRegex, replaceTerm);
          }

          return { ...seg, text, translation, speaker };
        });
      }

      // Replace in summary, highlights, action items
      if (scopeSummary) {
        if (updatedSummary) {
          updatedSummary = updatedSummary.replace(searchRegex, replaceTerm);
        }
        if (updatedTranslatedSummary) {
          updatedTranslatedSummary = updatedTranslatedSummary.replace(
            searchRegex,
            replaceTerm
          );
        }
        if (updatedHighlights) {
          updatedHighlights = updatedHighlights.map((h) =>
            h.replace(searchRegex, replaceTerm)
          );
        }
        if (updatedActionItems) {
          updatedActionItems = updatedActionItems.map((a) =>
            a.replace(searchRegex, replaceTerm)
          );
        }
        if (updatedTranslatedHighlights) {
          updatedTranslatedHighlights = updatedTranslatedHighlights.map((h) =>
            h.replace(searchRegex, replaceTerm)
          );
        }
        if (updatedTranslatedActionItems) {
          updatedTranslatedActionItems = updatedTranslatedActionItems.map((a) =>
            a.replace(searchRegex, replaceTerm)
          );
        }
      }

      const updatedFullText = updatedSegments.map((s) => s.text).join(" ");

      await onApply({
        segments: updatedSegments,
        fullText: updatedFullText,
        summary: updatedSummary,
        translatedSummary: updatedTranslatedSummary,
        highlights: updatedHighlights,
        actionItems: updatedActionItems,
        translatedHighlights: updatedTranslatedHighlights,
        translatedActionItems: updatedTranslatedActionItems,
      });

      setSuccessMessage(
        `${matchCounts.total} occurrence${
          matchCounts.total > 1 ? "s" : ""
        } remplacée${matchCounts.total > 1 ? "s" : ""} avec succès !`
      );

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Error during find and replace:", err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Replace className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Rechercher et remplacer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corrigez un nom, un terme ou une faute partout en 1 clic
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Texte ou nom à rechercher :
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex : Dupont, M. Martin, OpenAI..."
                  autoFocus
                  className="w-full text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Remplacer par :
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="Ex : Dupond, Mme Martin, Anthropic..."
                  className="w-full text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                />
                <Replace className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Respecter la casse (Aa)</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Mot entier uniquement</span>
            </label>
          </div>

          {/* Scope selection */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Zones d'application :
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setScopeTranscript(!scopeTranscript)}
                className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-colors ${
                  scopeTranscript
                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">Transcription</span>
                {matchCounts.transcript > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                    {matchCounts.transcript}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setScopeSpeakers(!scopeSpeakers)}
                className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-colors ${
                  scopeSpeakers
                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">Locuteurs</span>
                {matchCounts.speakers > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                    {matchCounts.speakers}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setScopeSummary(!scopeSummary)}
                className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-colors ${
                  scopeSummary
                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">Synthèse</span>
                {matchCounts.summary > 0 && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300">
                    {matchCounts.summary}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Feedback & Stats */}
          {searchTerm.trim().length > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center justify-between">
              <span>
                {matchCounts.total > 0 ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {matchCounts.total} occurrence
                    {matchCounts.total > 1 ? "s" : ""} trouvée
                    {matchCounts.total > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    Aucune occurrence trouvée avec ces critères
                  </span>
                )}
              </span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleExecuteReplace}
            disabled={
              !searchTerm.trim() ||
              matchCounts.total === 0 ||
              isApplying ||
              (!scopeTranscript && !scopeSpeakers && !scopeSummary)
            }
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Replace className="w-3.5 h-3.5" />
            <span>
              {isApplying
                ? "Remplacement..."
                : `Remplacer tout (${matchCounts.total})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
