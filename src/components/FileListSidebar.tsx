import React, { useState, useEffect, useRef } from "react";
import {
  FileAudio,
  FileText,
  Search,
  Trash2,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  ChevronsUpDown,
  Move,
  GripVertical,
  MoreVertical,
} from "lucide-react";
import { AudioFileItem, FolderItem } from "../types";
import { formatBytes, formatTime } from "../utils/audioProcessor";
import { loadCollapsedFolders, saveCollapsedFolders } from "../utils/storage";

interface FileListSidebarProps {
  files: AudioFileItem[];
  folders: FolderItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onOpenExport: (item: AudioFileItem) => void;
  onCreateFolder: (name: string, color?: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveFileToFolder: (fileId: string, folderId: string | null) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

const FOLDER_COLORS = [
  { id: "indigo", label: "Indigo", bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", lightBg: "bg-indigo-50 dark:bg-indigo-950/50", border: "border-indigo-200 dark:border-indigo-800" },
  { id: "emerald", label: "Émeraude", bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", lightBg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-800" },
  { id: "amber", label: "Ambre", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", lightBg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-800" },
  { id: "rose", label: "Rose", bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", lightBg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-800" },
  { id: "purple", label: "Violet", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", lightBg: "bg-purple-50 dark:bg-purple-950/50", border: "border-purple-200 dark:border-purple-800" },
  { id: "sky", label: "Ciel", bg: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", lightBg: "bg-sky-50 dark:bg-sky-950/50", border: "border-sky-200 dark:border-sky-800" },
];

export const FileListSidebar: React.FC<FileListSidebarProps> = ({
  files,
  folders,
  selectedFileId,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  onOpenExport,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFileToFolder,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Collapsed folders state (persisted)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(() => {
    return new Set(loadCollapsedFolders());
  });

  // Collapsed root state
  const [isRootCollapsed, setIsRootCollapsed] = useState<boolean>(false);

  // New folder creation inline state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("indigo");

  // Editing folder name inline
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderTitle, setEditingFolderTitle] = useState("");

  // Dropdown move menu state
  const [moveMenuFileId, setMoveMenuFileId] = useState<string | null>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Drag & drop state
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | "root">(null);

  // Save collapsed folders on change
  useEffect(() => {
    saveCollapsedFolders(Array.from(collapsedFolderIds));
  }, [collapsedFolderIds]);

  // Close move menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setMoveMenuFileId(null);
      }
    };
    if (moveMenuFileId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moveMenuFileId]);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const toggleCollapseAll = () => {
    if (collapsedFolderIds.size > 0 || isRootCollapsed) {
      // Expand all
      setCollapsedFolderIds(new Set());
      setIsRootCollapsed(false);
    } else {
      // Collapse all
      setCollapsedFolderIds(new Set(folders.map((f) => f.id)));
      setIsRootCollapsed(true);
    }
  };

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

  const handleStartFolderRename = (folder: FolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderTitle(folder.name);
  };

  const handleSaveFolderRename = (folderId: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    const trimmed = editingFolderTitle.trim();
    if (trimmed && trimmed.length > 0) {
      onRenameFolder(folderId, trimmed);
    }
    setEditingFolderId(null);
    setEditingFolderTitle("");
  };

  const handleCreateFolderSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newFolderName.trim();
    if (trimmed) {
      onCreateFolder(trimmed, newFolderColor);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const getFolderColorConfig = (colorId?: string) => {
    return (
      FOLDER_COLORS.find((c) => c.id === colorId) ||
      FOLDER_COLORS[0]
    );
  };

  // Filter files by search
  const q = searchQuery.toLowerCase().trim();
  const isSearching = q.length > 0;

  const matchesSearch = (f: AudioFileItem) => {
    if (!isSearching) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.fullText.toLowerCase().includes(q) ||
      (f.detectedLanguage && f.detectedLanguage.toLowerCase().includes(q)) ||
      (f.summary && f.summary.toLowerCase().includes(q))
    );
  };

  // Group files by folder
  const filesByFolder: Record<string, AudioFileItem[]> = {};
  folders.forEach((fld) => {
    filesByFolder[fld.id] = [];
  });

  const rootFiles: AudioFileItem[] = [];

  files.forEach((file) => {
    if (!matchesSearch(file)) return;

    if (file.folderId && filesByFolder[file.folderId]) {
      filesByFolder[file.folderId].push(file);
    } else {
      rootFiles.push(file);
    }
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData("text/plain", fileId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedFileId(fileId);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string | "root") => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolderId !== targetFolderId) {
      setDragOverFolderId(targetFolderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetFolderId: string | "root") => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverFolderId === targetFolderId) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | "root") => {
    e.preventDefault();
    e.stopPropagation();
    const fileId = e.dataTransfer.getData("text/plain") || draggedFileId;
    if (fileId) {
      const target = targetFolderId === "root" ? null : targetFolderId;
      onMoveFileToFolder(fileId, target);
    }
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  const renderFileCard = (file: AudioFileItem) => {
    const isSelected = file.id === selectedFileId;
    const isBeingDragged = draggedFileId === file.id;

    return (
      <div
        key={file.id}
        draggable={editingFileId !== file.id}
        onDragStart={(e) => handleDragStart(e, file.id)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          onSelectFile(file.id);
          onCloseMobile?.();
        }}
        className={`p-3 transition-all cursor-pointer group relative select-none ${
          isBeingDragged ? "opacity-40 scale-95" : ""
        } ${
          isSelected
            ? "bg-indigo-50/85 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-400"
            : "hover:bg-slate-50 dark:hover:bg-slate-900/60 border-l-4 border-transparent"
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
                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                  title="Valider le nom (Entrée)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelRename}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Annuler (Échap)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 min-w-0">
                <span
                  className="text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
                  title="Glisser pour déplacer dans un répertoire"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>

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
            <div className="mt-1.5 flex items-center space-x-1.5 flex-wrap gap-y-1">
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
            </div>
          </div>

          {/* Actions buttons */}
          <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Move to folder button */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveMenuFileId(moveMenuFileId === file.id ? null : file.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Déplacer vers un répertoire..."
              >
                <FolderInput className="w-3.5 h-3.5" />
              </button>

              {/* Move menu popover */}
              {moveMenuFileId === file.id && (
                <div
                  ref={moveMenuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1 font-semibold text-[10px] uppercase text-slate-400 tracking-wider">
                    Déplacer vers
                  </div>

                  {/* Root option */}
                  <button
                    type="button"
                    onClick={() => {
                      onMoveFileToFolder(file.id, null);
                      setMoveMenuFileId(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      !file.folderId ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span className="flex-1 truncate">Sans répertoire</span>
                    {!file.folderId && <Check className="w-3 h-3 text-indigo-600" />}
                  </button>

                  {/* Existing folders */}
                  {folders.map((fld) => {
                    const cfg = getFolderColorConfig(fld.color);
                    const isCurrent = file.folderId === fld.id;
                    return (
                      <button
                        key={fld.id}
                        type="button"
                        onClick={() => {
                          onMoveFileToFolder(file.id, fld.id);
                          setMoveMenuFileId(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          isCurrent ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Folder className={`w-3.5 h-3.5 ${cfg.text}`} />
                        <span className="flex-1 truncate">{fld.name}</span>
                        {isCurrent && <Check className="w-3 h-3 text-indigo-600" />}
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Create folder shortcut */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setMoveMenuFileId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer font-medium"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Nouveau répertoire...</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => handleStartRename(file, e)}
              className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Supprimer définitivement"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              Répertoires & Fichiers
            </h2>
          </div>

          <div className="flex items-center space-x-1">
            {/* New folder button */}
            <button
              type="button"
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Créer un nouveau répertoire ou catégorie"
            >
              <FolderPlus className="w-4 h-4" />
            </button>

            {/* Toggle collapse all */}
            {(folders.length > 0 || files.length > 0) && (
              <button
                type="button"
                onClick={toggleCollapseAll}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={
                  collapsedFolderIds.size > 0 || isRootCollapsed
                    ? "Tout déplier"
                    : "Tout réduire"
                }
              >
                <ChevronsUpDown className="w-4 h-4" />
              </button>
            )}

            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {files.length}
            </span>
          </div>
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Inline Create Folder Card */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Nouveau répertoire</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Nom du répertoire (ex: Réunions Comex)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Color selection dots */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewFolderColor(c.id)}
                    className={`w-4 h-4 rounded-full ${c.bg} transition-transform cursor-pointer ${
                      newFolderColor === c.id
                        ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                        : "opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2 py-1 text-[11px] rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Créer
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Folders & Files Main Tree Area */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && folders.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-2">
            <p>Aucun fichier ou répertoire pour l'instant.</p>
            <p className="text-[11px] text-slate-400">
              Importez votre premier fichier audio ou transcript, ou créez un répertoire pour organiser vos réunions.
            </p>
          </div>
        ) : files.length > 0 && rootFiles.length === 0 && folders.length === 0 && isSearching ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <p>Aucun résultat pour "{searchQuery}".</p>
          </div>
        ) : (
          <div className="py-1">
            {/* ------------------------------------------------------------- */}
            {/* FOLDERS LIST */}
            {/* ------------------------------------------------------------- */}
            {folders.map((folder) => {
              const folderFiles = filesByFolder[folder.id] || [];
              const isCollapsed = !isSearching && collapsedFolderIds.has(folder.id);
              const colorCfg = getFolderColorConfig(folder.color);
              const isDragOverThis = dragOverFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={(e) => handleDragLeave(e, folder.id)}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors ${
                    isDragOverThis
                      ? "bg-indigo-50/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-inset"
                      : ""
                  }`}
                >
                  {/* Folder Header Row */}
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer group hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      {/* Chevron expand/collapse */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform cursor-pointer"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Folder Icon */}
                      {isCollapsed ? (
                        <Folder className={`w-4 h-4 ${colorCfg.text} shrink-0`} />
                      ) : (
                        <FolderOpen className={`w-4 h-4 ${colorCfg.text} shrink-0`} />
                      )}

                      {/* Folder Name (or rename input) */}
                      {editingFolderId === folder.id ? (
                        <div
                          className="flex items-center space-x-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingFolderTitle}
                            onChange={(e) => setEditingFolderTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveFolderRename(folder.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingFolderId(null);
                              }
                            }}
                            className="w-full px-1.5 py-0.5 text-xs font-semibold rounded border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveFolderRename(folder.id, e)}
                            className="p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(null);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="truncate text-slate-800 dark:text-slate-200"
                          title={`${folder.name} (Double-cliquer pour renommer)`}
                          onDoubleClick={(e) => handleStartFolderRename(folder, e)}
                        >
                          {folder.name}
                        </span>
                      )}
                    </div>

                    {/* Right side: Count badge & Actions on hover */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {folderFiles.length}
                      </span>

                      {/* Folder action buttons */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleStartFolderRename(folder, e)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Renommer le répertoire"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Supprimer le répertoire "${folder.name}" ?\n\nLes fichiers qu'il contient ne seront pas supprimés, mais déplacés dans "Sans répertoire".`
                              )
                            ) {
                              onDeleteFolder(folder.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Supprimer le répertoire"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Drag drop hint when hovering over folder */}
                  {isDragOverThis && (
                    <div className="p-2 mx-3 mb-2 rounded-lg border border-dashed border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 text-[11px] text-indigo-700 dark:text-indigo-300 text-center font-medium">
                      Déposer ici pour classer dans "{folder.name}"
                    </div>
                  )}

                  {/* Folder Contents (Expanded) */}
                  {!isCollapsed && (
                    <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 ml-4 my-1 space-y-0.5">
                      {folderFiles.length === 0 ? (
                        <div className="py-2.5 px-3 text-[11px] text-slate-400 italic text-center">
                          Répertoire vide (glissez un fichier ici)
                        </div>
                      ) : (
                        folderFiles.map((file) => renderFileCard(file))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ------------------------------------------------------------- */}
            {/* ROOT / UNCATEGORIZED FILES */}
            {/* ------------------------------------------------------------- */}
            {(rootFiles.length > 0 || folders.length > 0) && (
              <div
                onDragOver={(e) => handleDragOver(e, "root")}
                onDragLeave={(e) => handleDragLeave(e, "root")}
                onDrop={(e) => handleDrop(e, "root")}
                className={`mt-1 transition-colors ${
                  dragOverFolderId === "root"
                    ? "bg-slate-100/90 dark:bg-slate-900/90 ring-2 ring-slate-400 ring-inset"
                    : ""
                }`}
              >
                {folders.length > 0 && (
                  <div
                    onClick={() => setIsRootCollapsed(!isRootCollapsed)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer group hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRootCollapsed(!isRootCollapsed);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {isRootCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Sans répertoire (Racine)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {rootFiles.length}
                    </span>
                  </div>
                )}

                {dragOverFolderId === "root" && (
                  <div className="p-2 mx-3 my-2 rounded-lg border border-dashed border-slate-400 bg-slate-50 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">
                    Déposer ici pour retirer de tout répertoire
                  </div>
                )}

                {(!isRootCollapsed || isSearching || folders.length === 0) && (
                  <div className={folders.length > 0 ? "pl-3 border-l-2 border-slate-200 dark:border-slate-800 ml-4 my-1 space-y-0.5" : "space-y-0.5"}>
                    {rootFiles.length === 0 && folders.length > 0 ? (
                      <div className="py-2 px-3 text-[11px] text-slate-400 italic text-center">
                        Aucun fichier non classé
                      </div>
                    ) : (
                      rootFiles.map((file) => renderFileCard(file))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
