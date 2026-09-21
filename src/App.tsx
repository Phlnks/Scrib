import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { AudioUploader } from "./components/AudioUploader";
import { FileListSidebar } from "./components/FileListSidebar";
import { TranscriptViewer } from "./components/TranscriptViewer";
import { AudioPlayer } from "./components/AudioPlayer";
import { ExportModal } from "./components/ExportModal";
import { AudioFileItem, SummaryFormat, TranscriptSegment, UserSettings } from "./types";
import { ParsedTranscriptResult } from "./utils/transcriptParser";
import {
  getAllAudioFileItems,
  getAudioBlob,
  saveAudioFileItem,
  deleteAudioFileItem,
  loadUserSettings,
  saveUserSettings,
} from "./utils/storage";
import {
  chunkAudioFile,
  getAudioDuration,
  blobToBase64,
  formatTime,
} from "./utils/audioProcessor";
import { Menu, PlusCircle, ArrowLeft } from "lucide-react";

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [files, setFiles] = useState<AudioFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(1);
  const [totalChunks, setTotalChunks] = useState(1);

  // Modal / Sidebar state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportItem, setExportItem] = useState<AudioFileItem | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const [activeView, setActiveView] = useState<"viewer" | "uploader">("uploader");
  const [viewerTab, setViewerTab] = useState<"transcript" | "summary">("transcript");

  // Load files on mount
  useEffect(() => {
    getAllAudioFileItems()
      .then((items) => {
        setFiles(items);
        if (items.length > 0) {
          setSelectedFileId(items[0].id);
          setActiveView("viewer");
        } else {
          setActiveView("uploader");
        }
      })
      .catch((err) => console.error("Error loading files from DB:", err));
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    saveUserSettings(settings);
  }, [settings]);

  // Load audio blob when selectedFileId changes
  useEffect(() => {
    if (selectedFileId) {
      getAudioBlob(selectedFileId).then((blob) => {
        setActiveAudioBlob(blob);
      });
      const selected = files.find((f) => f.id === selectedFileId);
      if (selected) {
        setDuration(selected.duration);
        setCurrentTime(0);
      }
    } else {
      setActiveAudioBlob(null);
    }
  }, [selectedFileId, files]);

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveUserSettings(updated);
      return updated;
    });
  };

  // Transcription workflow for files up to 1 hour (with chunking)
  const handleStartTranscription = async (
    file: File | Blob,
    options: {
      fileName: string;
      sourceLanguage: string;
      targetLanguage?: string;
      detectSpeakers: boolean;
      aiEnhancement: boolean;
    }
  ) => {
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressMessage("Étape 1/2 : Analyse et découpage de l'audio en tranches de 10 min...");

    const fileDuration = await getAudioDuration(file);
    const newId = "audio_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Initial placeholder item
    const newItem: AudioFileItem = {
      id: newId,
      name: options.fileName,
      fileSize: file.size,
      fileType: file.type || "audio/mp3",
      duration: fileDuration,
      createdAt: new Date().toISOString(),
      status: "processing",
      progress: 5,
      progressMessage: "Étape 1/2 : Découpage de l'enregistrement en tranches de 10 min...",
      segments: [],
      fullText: "",
      sourceLanguage: options.sourceLanguage,
      targetLanguage: "none",
    };

    setFiles((prev) => [newItem, ...prev]);
    setSelectedFileId(newId);

    try {
      // Step 1: Strictly handle the 10-minute (600 seconds) audio chunking first
      const chunkDurationSec = 600; // 10 minutes strictly as requested
      const chunks = await chunkAudioFile(
        file,
        chunkDurationSec,
        (msg, pct) => {
          setProgressMessage(msg);
          setProgressPercent(Math.min(40, Math.round(pct * 0.4)));
        }
      );

      setTotalChunks(chunks.length);
      const allSegments: TranscriptSegment[] = [];
      let detectedLang = "";

      // Step 2: Sequentially transcribe each 10-minute part with AI
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setCurrentChunk(i + 1);
        const chunkBasePct = 40 + Math.round((i / chunks.length) * 50);
        setProgressPercent(chunkBasePct);
        setProgressMessage(
          `Étape 2/2 : Transcription IA de la partie ${i + 1}/${chunks.length} (${formatTime(
            chunk.startTime
          )} - ${formatTime(chunk.endTime)})...`
        );

        // Resilient fetch with client-side retry for temporary 503 capacity spikes
        let chunkResponse: any = null;
        let lastError: any = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch("/api/transcribe-chunk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioData: chunk.base64,
                mimeType: chunk.mimeType,
                timeOffset: chunk.startTime,
                sourceLanguage: options.sourceLanguage,
                detectSpeakers: options.detectSpeakers,
                aiEnhance: options.aiEnhancement,
                chunkIndex: i,
                totalChunks: chunks.length,
              }),
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(
                errData.error || `Erreur serveur HTTP ${response.status} sur la partie ${i + 1}`
              );
            }

            chunkResponse = await response.json();
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[Client] Chunk ${i + 1} attempt ${attempt} warning:`, err);
            if (attempt < maxRetries) {
              const waitSec = attempt * 2;
              setProgressMessage(
                `Serveurs IA temporairement sollicités. Nouvelle tentative dans ${waitSec}s (essai ${attempt + 1}/${maxRetries})...`
              );
              await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
            }
          }
        }

        if (!chunkResponse) {
          throw lastError || new Error(`Échec de la transcription de la partie ${i + 1}`);
        }

        const chunkData = chunkResponse.data;

        if (chunkData.detectedLanguage && !detectedLang) {
          detectedLang = chunkData.detectedLanguage;
        }

        if (chunkData.segments && Array.isArray(chunkData.segments)) {
          chunkData.segments.forEach((seg: any, sIdx: number) => {
            allSegments.push({
              id: `seg_${i}_${sIdx}_${Date.now()}`,
              start: typeof seg.start === "number" ? seg.start : chunk.startTime,
              end: typeof seg.end === "number" ? seg.end : chunk.endTime,
              speaker: seg.speaker || `Interlocuteur 1`,
              text: seg.text || "",
            });
          });
        }

        // Live update partial segments in UI
        setFiles((prev) =>
          prev.map((f) =>
            f.id === newId
              ? {
                  ...f,
                  segments: [...allSegments],
                  progress: chunkBasePct,
                }
              : f
          )
        );
      }

      // Step 3: Enhance with AI (Executive Summary, Highlights, Action Items in original language)
      setProgressPercent(92);
      setProgressMessage("Génération de la synthèse exécutive et des points clés...");

      const fullText = allSegments.map((s) => s.text).join(" ");
      let summary = "";
      let highlights: string[] = [];
      let actionItems: string[] = [];
      let topics: string[] = [];

      try {
        const enhanceRes = await fetch("/api/enhance-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullText,
            detectedLanguage: detectedLang || "Français",
            duration: fileDuration,
            format: "detailed",
          }),
        });

        if (enhanceRes.ok) {
          const enhanceData = await enhanceRes.json();
          summary = enhanceData.analysis?.summary || "";
          highlights = enhanceData.analysis?.highlights || [];
          actionItems = enhanceData.analysis?.actionItems || [];
          topics = enhanceData.analysis?.topics || [];
        }
      } catch (e) {
        console.warn("AI enhancement summary optional step failed:", e);
      }

      // Finalize item
      const completedItem: AudioFileItem = {
        ...newItem,
        status: "completed",
        progress: 100,
        progressMessage: "Transcription terminée avec succès !",
        segments: allSegments,
        fullText,
        detectedLanguage: detectedLang || "Audio",
        summary,
        summaryFormat: "detailed",
        highlights,
        actionItems,
        topics,
      };

      // Save to IndexedDB
      await saveAudioFileItem(completedItem, file);

      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? completedItem : f))
      );
      setSelectedFileId(newId);
      setActiveAudioBlob(file);
      setActiveView("viewer");
    } catch (err: any) {
      console.error("Transcription process error:", err);
      const errorItem: AudioFileItem = {
        ...newItem,
        status: "error",
        error: err.message || "Échec de la transcription",
        progressMessage: `Erreur : ${err.message}`,
      };
      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? errorItem : f))
      );
      alert(`Erreur lors de la transcription : ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct transcript file import workflow (SRT, VTT, JSON, DOCX, TXT, CSV...)
  const handleImportTranscript = async (
    file: File,
    parsed: ParsedTranscriptResult,
    options: {
      summaryFormat: SummaryFormat;
      language: string;
    }
  ) => {
    setIsProcessing(true);
    setProgressPercent(15);
    setProgressMessage("Lecture et structuration des segments du transcript...");

    const newId = "trans_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const initialItem: AudioFileItem = {
      id: newId,
      name: parsed.fileName,
      fileSize: file.size,
      fileType: file.type || "text/plain",
      duration: parsed.estimatedDuration,
      createdAt: new Date().toISOString(),
      status: "processing",
      progress: 30,
      progressMessage: "Génération de la synthèse détaillée et des actions à retenir...",
      segments: parsed.segments,
      fullText: parsed.fullText,
      sourceLanguage: options.language,
      targetLanguage: "none",
      isTranscriptImport: true,
      transcriptFormat: parsed.formatDetected,
    };

    setFiles((prev) => [initialItem, ...prev]);
    setSelectedFileId(newId);
    setActiveAudioBlob(null);

    try {
      setProgressPercent(50);
      setProgressMessage("Génération du résumé exécutif, des points essentiels et des actions...");

      const langToUse = options.language === "auto" ? "Français" : options.language;
      const formatToUse = options.summaryFormat || "detailed";

      const enhanceRes = await fetch("/api/enhance-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: parsed.fullText,
          detectedLanguage: langToUse,
          duration: parsed.estimatedDuration,
          format: formatToUse,
        }),
      });

      if (!enhanceRes.ok) {
        const errData = await enhanceRes.json().catch(() => ({}));
        throw new Error(errData.error || "Échec lors de la génération de la synthèse IA");
      }

      const enhanceData = await enhanceRes.json();
      const summary = enhanceData.analysis?.summary || "";
      const highlights = enhanceData.analysis?.highlights || [];
      const actionItems = enhanceData.analysis?.actionItems || [];
      const topics = enhanceData.analysis?.topics || [];

      const completedItem: AudioFileItem = {
        ...initialItem,
        status: "completed",
        progress: 100,
        progressMessage: "Synthèse détaillée et transcription prêtes !",
        summary,
        summaryFormat: formatToUse,
        summaryLanguage: options.language === "auto" ? "fr" : options.language,
        highlights,
        actionItems,
        topics,
        detectedLanguage: langToUse,
      };

      await saveAudioFileItem(completedItem);

      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? completedItem : f))
      );
      setSelectedFileId(newId);
      setActiveView("viewer");
      setViewerTab("summary");
    } catch (err: any) {
      console.error("Transcript import enhance error:", err);
      const errorItem: AudioFileItem = {
        ...initialItem,
        status: "error",
        error: err.message || "Échec de l'analyse",
        progressMessage: `Erreur : ${err.message}`,
      };
      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? errorItem : f))
      );
      alert(`Erreur lors de l'analyse du transcript : ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-generate or update AI Summary & Analysis with selectable format
  const handleEnhanceWithAI = async (format: SummaryFormat = "detailed") => {
    const current = files.find((f) => f.id === selectedFileId);
    if (!current || !current.fullText) return;

    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: current.fullText,
          detectedLanguage: current.detectedLanguage || current.sourceLanguage || "Français",
          format,
          duration: current.duration,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur lors de l'analyse");
      const data = await res.json();

      const updatedItem: AudioFileItem = {
        ...current,
        summary: data.analysis?.summary,
        summaryFormat: format,
        summaryLanguage: current.detectedLanguage || "fr",
        // Clear old translation when regenerating new summary format
        translatedSummary: undefined,
        translatedSummaryLanguage: undefined,
        translatedHighlights: undefined,
        translatedActionItems: undefined,
        highlights: data.analysis?.highlights,
        actionItems: data.analysis?.actionItems,
        topics: data.analysis?.topics,
      };

      await saveAudioFileItem(updatedItem);
      setFiles((prev) =>
        prev.map((f) => (f.id === current.id ? updatedItem : f))
      );
      setViewerTab("summary");
    } catch (e: any) {
      alert("Échec de l'amélioration IA : " + e.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Direct summary translation
  const handleTranslateSummary = async (targetLang: string) => {
    const current = files.find((f) => f.id === selectedFileId);
    if (!current || !current.summary) return;

    setIsTranslatingSummary(true);
    try {
      const res = await fetch("/api/translate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: current.summary,
          highlights: current.highlights || [],
          actionItems: current.actionItems || [],
          targetLanguage: targetLang,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur lors de la traduction du résumé");
      const data = await res.json();

      const updatedItem: AudioFileItem = {
        ...current,
        translatedSummary: data.translatedSummary,
        translatedSummaryLanguage: data.targetLanguage,
        translatedHighlights: data.translatedHighlights && data.translatedHighlights.length > 0 ? data.translatedHighlights : undefined,
        translatedActionItems: data.translatedActionItems && data.translatedActionItems.length > 0 ? data.translatedActionItems : undefined,
      };

      await saveAudioFileItem(updatedItem);
      setFiles((prev) =>
        prev.map((f) => (f.id === current.id ? updatedItem : f))
      );
    } catch (e: any) {
      alert("Échec de la traduction de la synthèse : " + e.message);
    } finally {
      setIsTranslatingSummary(false);
    }
  };

  // Update a single segment text/speaker
  const handleUpdateSegment = async (
    segmentId: string,
    updated: Partial<TranscriptSegment>
  ) => {
    const current = files.find((f) => f.id === selectedFileId);
    if (!current) return;

    const newSegments = current.segments.map((s) =>
      s.id === segmentId ? { ...s, ...updated } : s
    );
    const newFullText = newSegments.map((s) => s.text).join(" ");

    const updatedItem: AudioFileItem = {
      ...current,
      segments: newSegments,
      fullText: newFullText,
    };

    setFiles((prev) =>
      prev.map((f) => (f.id === current.id ? updatedItem : f))
    );
    await saveAudioFileItem(updatedItem);
  };

  // Update item properties (summary, highlights, action items, segments, etc.)
  const handleUpdateItem = async (updatedFields: Partial<AudioFileItem>) => {
    const current = files.find((f) => f.id === selectedFileId);
    if (!current) return;

    const updatedItem: AudioFileItem = {
      ...current,
      ...updatedFields,
    };

    if (updatedFields.segments) {
      updatedItem.fullText = updatedFields.segments.map((s) => s.text).join(" ");
    }

    setFiles((prev) =>
      prev.map((f) => (f.id === current.id ? updatedItem : f))
    );
    await saveAudioFileItem(updatedItem);
  };

  // Rename speaker across all segments in one click
  const handleRenameSpeakerEverywhere = async (
    oldSpeakerName: string,
    newSpeakerName: string
  ) => {
    const current = files.find((f) => f.id === selectedFileId);
    if (!current) return;
    const trimmed = newSpeakerName.trim();
    if (!trimmed || trimmed === oldSpeakerName) return;

    const newSegments = current.segments.map((s) =>
      s.speaker === oldSpeakerName ? { ...s, speaker: trimmed } : s
    );

    const updatedItem: AudioFileItem = {
      ...current,
      segments: newSegments,
    };

    setFiles((prev) =>
      prev.map((f) => (f.id === current.id ? updatedItem : f))
    );
    await saveAudioFileItem(updatedItem);
  };

  // Delete an audio file and transcript permanently
  const handleDeleteFile = async (id: string) => {
    // If the active file is being deleted, immediately clear the blob in memory and playback state
    if (selectedFileId === id) {
      setActiveAudioBlob(null);
      setCurrentTime(0);
      setDuration(0);
    }

    // Permanently purge both metadata and the binary audio blob from IndexedDB storage
    await deleteAudioFileItem(id);

    const newFiles = files.filter((f) => f.id !== id);
    setFiles(newFiles);
    if (selectedFileId === id) {
      if (newFiles.length > 0) {
        setSelectedFileId(newFiles[0].id);
      } else {
        setSelectedFileId(null);
        setActiveView("uploader");
      }
    }
  };

  // Rename an audio file item
  const handleRenameFile = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const current = files.find((f) => f.id === id);
    if (!current || current.name === trimmed) return;

    const updated = { ...current, name: trimmed };
    await saveAudioFileItem(updated);
    setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  const selectedItem = files.find((f) => f.id === selectedFileId);

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation */}
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewTranscription={() => setActiveView("uploader")}
        hasItems={files.length > 0}
      />

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Mobile sidebar overlay toggle */}
        <div className="lg:hidden absolute top-3 left-3 z-30">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300"
            title="Liste des fichiers"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar file list */}
        <FileListSidebar
          files={files}
          selectedFileId={selectedFileId}
          onSelectFile={(id) => {
            setSelectedFileId(id);
            setActiveView("viewer");
          }}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onOpenExport={(item) => {
            setExportItem(item);
            setIsExportOpen(true);
          }}
          isOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Canvas */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeView === "uploader" || !selectedItem ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
              <AudioUploader
                onStartTranscription={handleStartTranscription}
                onImportTranscript={handleImportTranscript}
                isProcessing={isProcessing}
                progressMessage={progressMessage}
                progressPercent={progressPercent}
                currentChunk={currentChunk}
                totalChunks={totalChunks}
                settings={settings}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <TranscriptViewer
                item={selectedItem}
                currentTime={currentTime}
                onSeek={(time) => setSeekToTime(time)}
                onUpdateSegment={handleUpdateSegment}
                onUpdateItem={handleUpdateItem}
                onRenameSpeakerEverywhere={handleRenameSpeakerEverywhere}
                onOpenExport={() => {
                  setExportItem(selectedItem);
                  setIsExportOpen(true);
                }}
                onEnhanceWithAI={handleEnhanceWithAI}
                onTranslateSummary={handleTranslateSummary}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                isEnhancing={isEnhancing}
                isTranslatingSummary={isTranslatingSummary}
                activeTab={viewerTab}
                onTabChange={setViewerTab}
              />

              {/* Synchronized Audio Player Bar - visible only on transcript tab when audio file is attached */}
              <div
                className={
                  viewerTab === "transcript" && !selectedItem.isTranscriptImport
                    ? "shrink-0 block"
                    : "hidden"
                }
              >
                <AudioPlayer
                  audioBlob={activeAudioBlob}
                  currentTime={currentTime}
                  duration={duration || selectedItem.duration}
                  onTimeUpdate={(t) => setCurrentTime(t)}
                  onDurationChange={(d) => setDuration(d)}
                  seekToTime={seekToTime}
                  onSeekHandled={() => setSeekToTime(null)}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => {
          setIsExportOpen(false);
          setExportItem(null);
        }}
        item={exportItem || selectedItem || null}
      />
    </div>
  );
}
