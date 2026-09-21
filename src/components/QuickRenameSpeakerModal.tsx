import React, { useState, useEffect } from "react";
import { X, User, Check } from "lucide-react";

interface QuickRenameSpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpeaker: string;
  occurrencesCount: number;
  onRename: (oldName: string, newName: string) => Promise<void>;
}

export const QuickRenameSpeakerModal: React.FC<QuickRenameSpeakerModalProps> = ({
  isOpen,
  onClose,
  currentSpeaker,
  occurrencesCount,
  onRename,
}) => {
  const [newName, setNewName] = useState(currentSpeaker);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewName(currentSpeaker);
  }, [currentSpeaker, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentSpeaker) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onRename(currentSpeaker, trimmed);
      onClose();
    } catch (err) {
      console.error("Error renaming speaker:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Renommer l'intervenant
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Modifie le nom sur l'ensemble de ses interventions
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

          {/* Body */}
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nouveau nom pour "{currentSpeaker}" :
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                placeholder="Ex : Alice Dupont, Dr. Martin..."
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              💡 Ce nouveau nom sera automatiquement appliqué à l'ensemble des{" "}
              <strong className="text-indigo-600 dark:text-indigo-400">
                {occurrencesCount} segment{occurrencesCount > 1 ? "s" : ""}
              </strong>{" "}
              où intervient cette personne.
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !newName.trim() || newName.trim() === currentSpeaker}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? "Enregistrement..." : "Appliquer partout"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
