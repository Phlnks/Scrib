import React from "react";
import {
  X,
  Sliders,
  Moon,
  Sun,
  Type,
  Clock,
  Users,
  SplitSquareVertical,
  Scissors,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { UserSettings } from "../types";
import { DEFAULT_SETTINGS } from "../utils/storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 overflow-hidden transition-all bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Personnalisation & Options
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajustez l'affichage, l'IA et le traitement audio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Theme */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Apparence & Thème
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: "light" })}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  settings.theme === "light"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Mode Clair</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: "dark" })}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  settings.theme === "dark"
                    ? "border-indigo-500 bg-indigo-950/40 text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Mode Sombre</span>
              </button>
            </div>
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taille du texte du transcript
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: "sm", label: "Petit" },
                  { id: "base", label: "Normal" },
                  { id: "lg", label: "Grand" },
                  { id: "xl", label: "Très Grand" },
                ] as const
              ).map((size) => (
                <button
                  key={size.id}
                  onClick={() => onUpdateSettings({ fontSize: size.id })}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    settings.fontSize === size.id
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Toggles */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Éléments affichés dans la transcription
            </label>
            <div className="space-y-2.5">
              {/* Timestamps */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-sm font-medium">Horodatages précis</span>
                    <p className="text-xs text-slate-500">
                      Affiche [00:01:23] au début de chaque phrase
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) =>
                    onUpdateSettings({ showTimestamps: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
              </label>

              {/* Speakers */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-sm font-medium">Diarisation des intervenants</span>
                    <p className="text-xs text-slate-500">
                      Différencie les voix (Intervenant 1, Intervenant 2...)
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showSpeakers}
                  onChange={(e) =>
                    onUpdateSettings({ showSpeakers: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
              </label>

              {/* Auto scroll */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <SplitSquareVertical className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-sm font-medium">Défilement synchronisé</span>
                    <p className="text-xs text-slate-500">
                      Suit la lecture audio en temps réel dans le texte
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoScroll}
                  onChange={(e) =>
                    onUpdateSettings({ autoScroll: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
              </label>
            </div>
          </div>

          {/* Long Audio Chunking & AI Processing */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Traitement des fichiers longs (jusqu'à 1 heure)
            </label>

            {/* Chunk duration */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium">Découpage automatique par tranche</span>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {settings.chunkDurationMinutes} minutes
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Divise les gros enregistrements en segments digestibles pour l'IA, puis réassemble les horodatages continus.
              </p>
              <div className="flex space-x-2 pt-1">
                {[3, 5, 8, 10].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ chunkDurationMinutes: mins })
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                      settings.chunkDurationMinutes === mins
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* AI Enhancement */}
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-sm font-medium">Amélioration IA de la précision</span>
                  <p className="text-xs text-slate-500">
                    Punctuation, majuscules et suppression des hésitations ("euh", "ah")
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.aiEnhancement}
                onChange={(e) =>
                  onUpdateSettings({ aiEnhancement: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
            className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser par défaut</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
