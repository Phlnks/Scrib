import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileAudio,
  FileText,
  Sparkles,
  Languages,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Scissors,
  Play,
  Layers,
  FileCode,
  FileCheck2,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { UserSettings, SummaryFormat } from "../types";
import { formatBytes, formatTime } from "../utils/audioProcessor";
import {
  parseTranscriptFile,
  ParsedTranscriptResult,
} from "../utils/transcriptParser";

interface AudioUploaderProps {
  onStartTranscription: (
    file: File | Blob,
    options: {
      fileName: string;
      sourceLanguage: string;
      targetLanguage: string;
      detectSpeakers: boolean;
      aiEnhancement: boolean;
    }
  ) => void;
  onImportTranscript?: (
    file: File,
    parsed: ParsedTranscriptResult,
    options: {
      summaryFormat: SummaryFormat;
      language: string;
    }
  ) => void;
  isProcessing: boolean;
  progressMessage?: string;
  progressPercent?: number;
  currentChunk?: number;
  totalChunks?: number;
  settings: UserSettings;
}

const DEMO_TRANSCRIPT_VTT = `WEBVTT - Réunion stratégique de cadrage projet Scrib

00:00:02.000 --> 00:00:16.000
<v Marc (Directeur de Projet)>Bonjour à tous et bienvenue. L'ordre du jour d'aujourd'hui porte sur l'intégration du support direct des fichiers de transcription dans Scrib et la génération automatique de synthèses exécutives complètes.

00:00:16.500 --> 00:00:35.000
<v Sophie (Lead Tech)>Côté technique, l'analyseur prend désormais en compte les sous-titres SRT et WebVTT, les exports JSON (Whisper, Otter, Zoom), les documents Word DOCX ainsi que les fichiers texte et CSV. Tous les horodatages et locuteurs sont extraits fidèlement.

00:00:35.500 --> 00:00:54.000
<v Karim (UX & Produit)>C'est une forte demande des équipes : beaucoup disposent déjà d'une retranscription brute et veulent en quelques secondes un résumé structuré, les points clés majeurs et les actions opérationnelles sans réécouter l'intégralité de l'enregistrement.

00:00:54.500 --> 00:01:14.000
<v Marc (Directeur de Projet)>Parfaitement en phase. Passons aux décisions et aux arbitrages : nous validons l'ouverture de tous ces formats. Sophie, pourrais-tu finaliser la vérification de l'export PDF complet avec les actions d'ici vendredi 16h ?

00:01:14.500 --> 00:01:28.000
<v Sophie (Lead Tech)>C'est validé pour vendredi 16h, les tests de non-régression sont déjà bien avancés.

00:01:28.500 --> 00:01:42.000
<v Karim (UX & Produit)>De mon côté, je prépare le support de présentation et les guides utilisateurs pour la réunion plénière de mardi matin 10h.

00:01:42.500 --> 00:01:58.000
<v Marc (Directeur de Projet)>Décision actée : mise en production officielle programmée pour lundi prochain à 9h00. Merci à tous pour votre implication, la séance est levée.`;

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onStartTranscription,
  onImportTranscript,
  isProcessing,
  progressMessage,
  progressPercent = 0,
  currentChunk,
  totalChunks,
  settings,
}) => {
  // Input mode: "audio" vs "transcript"
  const [importMode, setImportMode] = useState<"audio" | "transcript">("audio");

  // Audio mode state
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioSourceLang, setAudioSourceLang] = useState("auto");
  const [detectSpeakers, setDetectSpeakers] = useState(true);
  const [aiEnhance, setAiEnhance] = useState(settings.aiEnhancement);

  // Transcript mode state
  const [selectedTranscriptFile, setSelectedTranscriptFile] = useState<File | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<ParsedTranscriptResult | null>(null);
  const [isParsingTranscript, setIsParsingTranscript] = useState(false);
  const [transcriptParseError, setTranscriptParseError] = useState<string | null>(null);
  const [transcriptSummaryFormat, setTranscriptSummaryFormat] = useState<SummaryFormat>("detailed");
  const [transcriptLanguage, setTranscriptLanguage] = useState("auto");

  // Drag & drop state
  const [dragActive, setDragActive] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if file is transcript
  const isTranscriptFile = (fileName: string) => {
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    return [".srt", ".vtt", ".json", ".csv", ".tsv", ".docx", ".txt", ".md"].includes(ext);
  };

  // Helper to check if file is audio
  const isAudioFile = (fileName: string, mimeType: string) => {
    const validExtensions = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm", ".aac"];
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    return mimeType.startsWith("audio/") || validExtensions.includes(ext);
  };

  // Process transcript file selection
  const processTranscriptFile = async (file: File) => {
    setSelectedTranscriptFile(file);
    setIsParsingTranscript(true);
    setTranscriptParseError(null);

    try {
      const parsed = await parseTranscriptFile(file);
      setParsedTranscript(parsed);
    } catch (err: any) {
      console.error("Failed to parse transcript file:", err);
      setTranscriptParseError(
        err.message || "Impossible de lire ou parser ce fichier de transcription."
      );
      setParsedTranscript(null);
    } finally {
      setIsParsingTranscript(false);
    }
  };

  // Process audio file selection
  const processAudioFile = (file: File) => {
    setSelectedAudioFile(file);
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      setAudioDuration(null);
      URL.revokeObjectURL(url);
    };
  };

  const handleGeneralFileSelect = (file: File) => {
    if (isTranscriptFile(file.name)) {
      setImportMode("transcript");
      processTranscriptFile(file);
    } else if (isAudioFile(file.name, file.type)) {
      setImportMode("audio");
      processAudioFile(file);
    } else {
      if (importMode === "transcript") {
        processTranscriptFile(file);
      } else {
        processAudioFile(file);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGeneralFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleLaunchAudioTranscription = () => {
    if (!selectedAudioFile) return;
    onStartTranscription(selectedAudioFile, {
      fileName: selectedAudioFile.name,
      sourceLanguage: audioSourceLang,
      targetLanguage: "none",
      detectSpeakers,
      aiEnhancement: aiEnhance,
    });
  };

  const handleLaunchTranscriptAnalysis = () => {
    if (!selectedTranscriptFile || !parsedTranscript || !onImportTranscript) return;
    onImportTranscript(selectedTranscriptFile, parsedTranscript, {
      summaryFormat: transcriptSummaryFormat,
      language: transcriptLanguage,
    });
  };

  const handleLoadDemoTranscript = () => {
    const demoBlob = new Blob([DEMO_TRANSCRIPT_VTT], { type: "text/vtt" });
    const demoFile = new File([demoBlob], "reunion_cadrage_scrib.vtt", {
      type: "text/vtt",
    });
    setImportMode("transcript");
    processTranscriptFile(demoFile);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Header with clear title & mode tabs */}
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transcription & Synthèse Intelligente</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {importMode === "audio"
              ? "Transcription Vocale & Synthèse IA"
              : "Import de Transcription & Synthèse Détaillée"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {importMode === "audio"
              ? "Convertissez vos fichiers audio MP3, WAV, FLAC en texte avec diarisation des interlocuteurs, puis obtenez un résumé et des actions."
              : "Ajoutez un fichier de transcription existant (SRT, VTT, TXT, JSON, DOCX, MD, CSV) pour générer instantanément un résumé détaillé avec points essentiels et actions à retenir."}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              type="button"
              onClick={() => setImportMode("audio")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                importMode === "audio"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileAudio className="w-4 h-4" />
              <span>Fichier Audio (MP3, WAV, FLAC...)</span>
            </button>

            <button
              type="button"
              onClick={() => setImportMode("transcript")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                importMode === "transcript"
                  ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fichier Transcript (SRT, VTT, JSON, DOCX...)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Option directe
              </span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODE 1: AUDIO UPLOAD */}
        {/* ------------------------------------------------------------- */}
        {importMode === "audio" && !isProcessing && (
          <div className="mt-8 space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => audioInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.webm,.aac"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleGeneralFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Glissez-déposez votre fichier audio ici
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ou cliquez pour parcourir vos dossiers
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">MP3</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">WAV</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">FLAC</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">M4A</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">OGG</span>
                <span className="text-slate-400 ml-1">• Découpage automatique par tranches de 10 min</span>
              </div>
            </div>

            {/* Selected Audio File Settings Card */}
            {selectedAudioFile && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm">
                        {selectedAudioFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span>{formatBytes(selectedAudioFile.size)}</span>
                        {audioDuration && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(audioDuration)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAudioFile(null);
                      setAudioDuration(null);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Changer de fichier
                  </button>
                </div>

                {/* Configuration Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Langue principale de l'audio
                    </label>
                    <select
                      value={audioSourceLang}
                      onChange={(e) => setAudioSourceLang(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="auto">Détection automatique</option>
                      <option value="Français">Français</option>
                      <option value="Anglais">Anglais (English)</option>
                      <option value="Espagnol">Espagnol (Español)</option>
                      <option value="Allemand">Allemand (Deutsch)</option>
                      <option value="Italien">Italien (Italiano)</option>
                      <option value="Portugais">Portugais</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Options de détection
                    </label>
                    <label className="flex items-center space-x-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={detectSpeakers}
                        onChange={(e) => setDetectSpeakers(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-800 dark:text-slate-200">
                        Identifier les intervenants (Diarisation)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Long Audio Info */}
                {audioDuration && audioDuration > 600 && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-start space-x-2 text-xs text-indigo-900 dark:text-indigo-200">
                    <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Enregistrement long ({formatTime(audioDuration)}) :</span>{" "}
                      Scrib découpe automatiquement en parties de 10 min, transcrit chaque tronçon puis réassemble le tout de manière parfaitement synchrone.
                    </div>
                  </div>
                )}

                {/* Start Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLaunchAudioTranscription}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Lancer la transcription audio</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE 2: TRANSCRIPT FILE UPLOAD (SRT, VTT, JSON, DOCX, TXT...) */}
        {/* ------------------------------------------------------------- */}
        {importMode === "transcript" && !isProcessing && (
          <div className="mt-8 space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => transcriptInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-950/40"
              }`}
            >
              <input
                ref={transcriptInputRef}
                type="file"
                accept=".srt,.vtt,.json,.csv,.tsv,.docx,.txt,.md,text/plain,text/vtt,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleGeneralFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <FileCode className="w-7 h-7" />
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Glissez-déposez votre fichier de transcription ici
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Formats acceptés : SRT, WebVTT, JSON (Whisper / Teams), Word (DOCX), Markdown ou Texte brut
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                  .SRT
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                  .VTT
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                  .JSON (Whisper, Zoom)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                  .DOCX (Word)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-medium border border-emerald-200 dark:border-emerald-800">
                  .TXT / .MD / .CSV
                </span>
              </div>
            </div>

            {/* Quick Demo Button */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Pas de fichier sous la main pour tester ?</span>
              </div>
              <button
                type="button"
                onClick={handleLoadDemoTranscript}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Charger un exemple de transcript (Réunion de cadrage) →
              </button>
            </div>

            {/* Parsing in progress */}
            {isParsingTranscript && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <div className="inline-block animate-spin text-emerald-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Analyse de la structure et extraction des segments en cours...
                </p>
              </div>
            )}

            {/* Parsing error */}
            {transcriptParseError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start space-x-3 text-xs text-rose-800 dark:text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Erreur de lecture du transcript :</span> {transcriptParseError}
                </div>
              </div>
            )}

            {/* Parsed Transcript Card & Configuration */}
            {parsedTranscript && selectedTranscriptFile && (
              <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 mt-0.5">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm">
                          {selectedTranscriptFile.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {parsedTranscript.formatDetected}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                        <span>{formatBytes(selectedTranscriptFile.size)}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {parsedTranscript.segments.length} segments détectés
                        </span>
                        <span>•</span>
                        <span>{parsedTranscript.wordCount} mots</span>
                        <span>•</span>
                        <span>~{Math.ceil(parsedTranscript.estimatedDuration / 60)} min estimées</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTranscriptFile(null);
                      setParsedTranscript(null);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Changer de fichier
                  </button>
                </div>

                {/* Synthesis configuration */}
                <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Configuration de la synthèse IA :</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Format selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Format du résumé IA souhaité
                      </label>
                      <select
                        value={transcriptSummaryFormat}
                        onChange={(e) => setTranscriptSummaryFormat(e.target.value as SummaryFormat)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="detailed">
                          Dossier & Synthèse détaillée (Complet, chapitres, nuances)
                        </option>
                        <option value="bullet_points">
                          Points clés & Faits majeurs (Liste à puces percutante)
                        </option>
                        <option value="meeting_minutes">
                          Procès-verbal de réunion (Ordre du jour, délibérations, décisions)
                        </option>
                        <option value="concise">
                          Synthétique & Rapide (2-3 paragraphes denses)
                        </option>
                      </select>
                    </div>

                    {/* Language selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Langue de rédaction de la synthèse
                      </label>
                      <select
                        value={transcriptLanguage}
                        onChange={(e) => setTranscriptLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="auto">Détection automatique (Langue du document)</option>
                        <option value="Français">Français</option>
                        <option value="Anglais">Anglais (English)</option>
                        <option value="Espagnol">Espagnol (Español)</option>
                        <option value="Allemand">Allemand (Deutsch)</option>
                        <option value="Italien">Italien (Italiano)</option>
                      </select>
                    </div>
                  </div>

                  {/* Highlights & Action items guarantee notice */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/50 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Génération automatique garantie : <strong>Résumé détaillé</strong>, <strong>Points essentiels</strong> et <strong>Actions à retenir</strong>.
                      </span>
                    </span>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLaunchTranscriptAnalysis}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Générer la synthèse détaillée & les actions</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PROCESSING OVERLAY (BOTH MODES) */}
        {/* ------------------------------------------------------------- */}
        {isProcessing && (
          <div className="mt-8 p-6 sm:p-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {progressMessage || "Traitement en cours..."}
              </h3>
              {totalChunks && totalChunks > 1 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Tranche : {currentChunk || 1} sur {totalChunks}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mx-auto space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Progression</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Extraction des enseignements majeurs, synthèse complète par chapitres et identification des actions à retenir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
