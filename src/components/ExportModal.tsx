import React, { useState } from "react";
import {
  X,
  Download,
  FileText,
  FileCode,
  Copy,
  Check,
  Clock,
  Users,
  Languages,
  Sparkles,
  Printer,
} from "lucide-react";
import { AudioFileItem } from "../types";
import {
  downloadPdf,
  downloadTxt,
  downloadSrt,
  generatePlainText,
  ExportOptions,
} from "../utils/exportUtils";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AudioFileItem | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    includeTimestamps: true,
    includeSpeakers: true,
    includeTranslation: true,
    includeSummary: true,
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const handleCopyClipboard = () => {
    const text = generatePlainText(item, options);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePdfExport = () => {
    downloadPdf(item, options);
    onClose();
  };

  const handleTxtExport = () => {
    downloadTxt(item, options);
    onClose();
  };

  const handleSrtExport = () => {
    downloadSrt(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl p-6 bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Exporter la transcription
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Customization Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Éléments à inclure dans l'export
          </label>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <div className="flex items-center space-x-2.5 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Horodatages [00:01:23]</span>
              </div>
              <input
                type="checkbox"
                checked={options.includeTimestamps}
                onChange={(e) =>
                  setOptions({ ...options, includeTimestamps: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <div className="flex items-center space-x-2.5 text-xs font-medium">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Noms des interlocuteurs</span>
              </div>
              <input
                type="checkbox"
                checked={options.includeSpeakers}
                onChange={(e) =>
                  setOptions({ ...options, includeSpeakers: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {item.translatedText || item.segments.some((s) => s.translation) ? (
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <div className="flex items-center space-x-2.5 text-xs font-medium">
                  <Languages className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Traductions bilingues</span>
                </div>
                <input
                  type="checkbox"
                  checked={options.includeTranslation}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      includeTranslation: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            ) : null}

            {item.summary ? (
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <div className="flex items-center space-x-2.5 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Synthèse exécutive & points clés</span>
                </div>
                <input
                  type="checkbox"
                  checked={options.includeSummary}
                  onChange={(e) =>
                    setOptions({ ...options, includeSummary: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            ) : null}
          </div>
        </div>

        {/* Export Formats Grid */}
        <div className="space-y-2.5 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Format de fichier
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* PDF Button */}
            <button
              onClick={handlePdfExport}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all text-indigo-900 dark:text-indigo-200 group"
            >
              <Printer className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-bold">Document PDF</span>
              <span className="text-[10px] text-slate-500">Mise en page pro A4</span>
            </button>

            {/* TXT Button */}
            <button
              onClick={handleTxtExport}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800 dark:text-slate-200 group"
            >
              <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-bold">Fichier Texte (.txt)</span>
              <span className="text-[10px] text-slate-500">Texte brut universel</span>
            </button>

            {/* SRT Subtitles */}
            <button
              onClick={handleSrtExport}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300"
            >
              <FileCode className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs font-semibold">Sous-titres (.srt)</span>
              <span className="text-[10px] text-slate-500">Pour vidéo / montage</span>
            </button>

            {/* Copy Clipboard */}
            <button
              onClick={handleCopyClipboard}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-500 mb-1" />
              ) : (
                <Copy className="w-5 h-5 text-slate-500 mb-1" />
              )}
              <span className="text-xs font-semibold">
                {copied ? "Copié !" : "Copier tout"}
              </span>
              <span className="text-[10px] text-slate-500">Presse-papiers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
