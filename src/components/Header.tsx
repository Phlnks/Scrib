import React from "react";
import {
  Moon,
  Sun,
  Settings,
  AudioWaveform,
  PlusCircle,
  FileAudio,
  Languages,
} from "lucide-react";
import { UserSettings } from "../types";

interface HeaderProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenSettings: () => void;
  onNewTranscription: () => void;
  hasItems: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onNewTranscription,
}) => {
  const toggleTheme = () => {
    onUpdateSettings({
      theme: settings.theme === "dark" ? "light" : "dark",
    });
  };

  return (
    <header className="shrink-0 z-30 border-b backdrop-blur-md transition-colors bg-white/90 border-slate-200 dark:bg-slate-950/90 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <AudioWaveform className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Scrib
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                AI Voice to Text
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Voice-to-Text • MP3, WAV, FLAC • Découpage 10 min • Audio 1h+
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="header-new-btn"
            onClick={onNewTranscription}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau fichier</span>
            <span className="sm:hidden">Nouveau</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            title={
              settings.theme === "dark"
                ? "Passer en mode clair"
                : "Passer en mode sombre"
            }
            className="p-2.5 rounded-xl transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900"
          >
            {settings.theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Settings button */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            title="Options de personnalisation"
            className="p-2.5 rounded-xl transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
