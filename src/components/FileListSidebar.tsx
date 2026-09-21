import React, { useState } from "react";
import {
  FileAudio,
  FileText,
  Search,
  Trash2,
  Download,
  Clock,
  Languages,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { AudioFileItem } from "../types";
import { formatBytes, formatTime } from "../utils/audioProcessor";

interface FileListSidebarProps {
  files: AudioFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onOpenExport: (item: AudioFileItem) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const FileListSidebar: React.FC<FileListSidebarProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  onOpenExport,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartRename = (file: AudioFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditingName(file.name);
  };

  const handleSaveRename = (fileId: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    const trimmed = editingName.trim();
    if (trimmed && trimmed.length > 0) {
      onRenameFile(fileId, trimmed);
    }
    setEditingFileId(null);
    setEditingName("");
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(null);
    setEditingName("");
  };

  const filteredFiles = files.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.fullText.toLowerCase().includes(q) ||
      (f.detectedLanguage && f.detectedLanguage.toLowerCase().includes(q)) ||
      (f.summary && f.summary.toLowerCase().includes(q))
    );
  });

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-80 border-r bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileAudio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
              Fichiers & Transcriptions
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {files.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, texte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
        {filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            {files.length === 0 ? (
              <p>Aucun fichier audio pour l'instant. Importez votre premier MP3, WAV ou FLAC.</p>
            ) : (
              <p>Aucun résultat pour "{searchQuery}".</p>
            )}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <div
                key={file.id}
                onClick={() => {
                  onSelectFile(file.id);
                  onCloseMobile?.();
                }}
                className={`p-3.5 transition-colors cursor-pointer group relative ${
                  isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="min-w-0 flex-1">
                    {editingFileId === file.id ? (
                      <div
                        className="flex items-center space-x-1.5 w-full my-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveRename(file.id);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelRename(e as any);
                            }
                          }}
                          className="flex-1 px-2 py-0.5 text-xs font-semibold rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none ring-2 ring-indigo-500/30"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(file.id, e)}
                          className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                          title="Valider le nom (Entrée)"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Annuler (Échap)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 min-w-0">
                        {file.isTranscriptImport ? (
                          <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <FileAudio className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                        <h3
                          className="text-xs font-semibold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title={`${file.name} (Double-cliquer ou bouton pour renommer)`}
                          onDoubleClick={(e) => handleStartRename(file, e)}
                        >
                          {file.name}
                        </h3>
                      </div>
                    )}

                    {/* Metadata line */}
                    <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {file.isTranscriptImport ? (
                        <>
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            {file.segments.length} segments
                          </span>
                          <span>•</span>
                          <span>{formatBytes(file.fileSize)}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-0.5" />
                            {formatTime(file.duration)}
                          </span>
                          <span>•</span>
                          <span>{formatBytes(file.fileSize)}</span>
                        </>
                      )}
                    </div>

                    {/* Status & tags */}
                    <div className="mt-2 flex items-center space-x-1.5 flex-wrap">
                      {file.isTranscriptImport && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          Transcript
                        </span>
                      )}
                      {file.status === "completed" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Prêt
                        </span>
                      )}
                      {file.status === "processing" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          En cours ({file.progress}%)
                        </span>
                      )}
                      {file.status === "error" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erreur
                        </span>
                      )}

                      {/* Language badges */}
                      {file.detectedLanguage && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {file.detectedLanguage}
                        </span>
                      )}
                      {file.targetLanguage && file.targetLanguage !== "none" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          → {file.targetLanguage.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(file, e)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Renommer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExport(file);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Exporter PDF / TXT"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Supprimer définitivement "${file.name}" ?\n\nCette action effacera la transcription et supprimera physiquement le fichier audio du stockage disque pour libérer l'espace.`
                          )
                        ) {
                          onDeleteFile(file.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Supprimer définitivement l'audio et la transcription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
