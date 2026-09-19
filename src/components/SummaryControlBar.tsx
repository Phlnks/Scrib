import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  List,
  FileCheck,
  Languages,
  Check,
  RefreshCw,
  X,
  AlignLeft,
  BookOpen,
} from "lucide-react";
import { SummaryFormat } from "../types";

export interface SummaryControlProps {
  currentFormat: SummaryFormat;
  onGenerateSummary: (format: SummaryFormat) => Promise<void>;
  onTranslateSummary: (targetLang: string) => Promise<void>;
  isGenerating: boolean;
  isTranslating: boolean;
  translatedLanguage?: string;
  hasSummary: boolean;
  activeSummaryView: "original" | "translated";
  setActiveSummaryView: (view: "original" | "translated") => void;
  detectedLanguage?: string;
}

const formatOptions: Array<{
  id: SummaryFormat;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "concise",
    label: "Léger / Concis",
    desc: "1 court paragraphe percutant (4-5 phrases max) avec l'essentiel",
    icon: <AlignLeft className="w-4 h-4" />,
  },
  {
    id: "detailed",
    label: "Détaillé / Complet",
    desc: "Synthèse exhaustive adaptée à la durée (dossier structuré et chapitré pour les enregistrements longs)",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: "bullet_points",
    label: "Points clés à puces",
    desc: "Paragraphes structurés sous forme de listes claires et aérées",
    icon: <List className="w-4 h-4" />,
  },
  {
    id: "meeting_minutes",
    label: "Compte-rendu de réunion",
    desc: "Format formel : contexte, décisions prises, obstacles et plan d'action",
    icon: <FileCheck className="w-4 h-4" />,
  },
];

const targetLanguages = [
  { code: "en", name: "Anglais", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Espagnol", flag: "🇪🇸" },
  { code: "de", name: "Allemand", flag: "🇩🇪" },
  { code: "it", name: "Italien", flag: "🇮🇹" },
  { code: "pt", name: "Portugais", flag: "🇵🇹" },
  { code: "ar", name: "Arabe", flag: "🇸🇦" },
  { code: "zh", name: "Chinois", flag: "🇨🇳" },
  { code: "ja", name: "Japonais", flag: "🇯🇵" },
];

export const SummaryControlBar: React.FC<SummaryControlProps> = ({
  currentFormat,
  onGenerateSummary,
  onTranslateSummary,
  isGenerating,
  isTranslating,
  translatedLanguage,
  hasSummary,
  activeSummaryView,
  setActiveSummaryView,
  detectedLanguage,
}) => {
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showTranslateDropdown, setShowTranslateDropdown] = useState(false);

  const activeFormatMeta =
    formatOptions.find((f) => f.id === currentFormat) || formatOptions[1];

  const handleSelectFormat = async (format: SummaryFormat) => {
    setShowFormatDropdown(false);
    await onGenerateSummary(format);
  };

  const handleSelectLanguage = async (code: string) => {
    setShowTranslateDropdown(false);
    await onTranslateSummary(code);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
      {/* Left: Format Selector */}
      <div className="flex items-center space-x-2 relative">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
          Format de synthèse :
        </span>

        {/* Format Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFormatDropdown(!showFormatDropdown);
              setShowTranslateDropdown(false);
            }}
            disabled={isGenerating || isTranslating}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              activeFormatMeta.icon
            )}
            <span>{isGenerating ? "Génération en cours..." : activeFormatMeta.label}</span>
            <span className="text-indigo-400 text-[10px]">▼</span>
          </button>

          {/* Format dropdown */}
          {showFormatDropdown && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Choisir le style de résumé
              </div>
              {formatOptions.map((opt) => {
                const isSelected = currentFormat === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectFormat(opt.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start space-x-2.5 ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400">
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Summary View toggle (if translated exists) & Translate Button */}
      <div className="flex items-center space-x-2">
        {/* Toggle between Original summary and Translated summary if available */}
        {translatedLanguage && (
          <div className="flex items-center rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setActiveSummaryView("original")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeSummaryView === "original"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Original ({detectedLanguage || "Audio"})
            </button>
            <button
              onClick={() => setActiveSummaryView("translated")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeSummaryView === "translated"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Traduit ({translatedLanguage.toUpperCase()})
            </button>
          </div>
        )}

        {/* Translation Trigger Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTranslateDropdown(!showTranslateDropdown);
              setShowFormatDropdown(false);
            }}
            disabled={!hasSummary || isTranslating || isGenerating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all disabled:opacity-50"
            title="Traduire instantanément le résumé généré"
          >
            {isTranslating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              {isTranslating
                ? "Traduction..."
                : translatedLanguage
                ? "Changer langue"
                : "Traduire le résumé"}
            </span>
            <span className="text-emerald-500 text-[10px]">▼</span>
          </button>

          {/* Languages Dropdown */}
          {showTranslateDropdown && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-30 p-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Traduire la synthèse vers :
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {targetLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {translatedLanguage === lang.code && (
                      <Check className="w-3 h-3 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
