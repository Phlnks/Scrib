import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileAudio,
  Sparkles,
  Languages,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Scissors,
  Play,
  Layers,
} from "lucide-react";
import { UserSettings } from "../types";
import { formatBytes, formatTime } from "../utils/audioProcessor";

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
  isProcessing: boolean;
  progressMessage?: string;
  progressPercent?: number;
  currentChunk?: number;
  totalChunks?: number;
  settings: UserSettings;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onStartTranscription,
  isProcessing,
  progressMessage,
  progressPercent = 0,
  currentChunk,
  totalChunks,
  settings,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [detectSpeakers, setDetectSpeakers] = useState(true);
  const [aiEnhance, setAiEnhance] = useState(settings.aiEnhancement);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    // Validate format
    const validExtensions = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm", ".aac"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const isAudioType = file.type.startsWith("audio/") || validExtensions.includes(ext);

    if (!isAudioType) {
      alert("Veuillez sélectionner un fichier audio valide (MP3, WAV, FLAC, M4A, OGG).");
      return;
    }

    setSelectedFile(file);

    // Compute duration
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLaunch = () => {
    if (!selectedFile) return;
    onStartTranscription(selectedFile, {
      fileName: selectedFile.name,
      sourceLanguage: sourceLang,
      targetLanguage: "none",
      detectSpeakers,
      aiEnhancement: aiEnhance,
    });
  };

  // Helper to load a demo sample audio generated in browser for instant testing
  const handleLoadDemoAudio = async () => {
    // Generate a simple 10-second synthesized tone speech WAV
    const sampleRate = 16000;
    const duration = 8;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);

    // Audio melody with harmonics simulating voice formant frequencies
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq1 = 220 + Math.sin(t * 3) * 40;
      const freq2 = 440 + Math.cos(t * 4) * 60;
      const sample =
        Math.sin(2 * Math.PI * freq1 * t) * 0.4 +
        Math.sin(2 * Math.PI * freq2 * t) * 0.2;
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const demoBlob = new Blob([view], { type: "audio/wav" });
    const demoFile = new File([demoBlob], "interview_bilingue_demo.wav", {
      type: "audio/wav",
    });

    handleFileChange(demoFile);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Introduction Card */}
      <div className="rounded-2xl border p-6 sm:p-8 bg-white border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transcription Vocale & Traduction IA
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Convertissez vos fichiers audio <strong className="text-indigo-600 dark:text-indigo-400">MP3, WAV, FLAC</strong> en texte avec horodatages, identification des interlocuteurs et traduction instantanée (Français ⇄ Anglais).
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Fichiers jusqu'à 1 heure+
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Scissors className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Découpage par tranches automatique
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Languages className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Traduction FR ⇄ EN intégrée
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Export PDF & TXT
            </span>
          </div>
        </div>

        {/* Dropzone */}
        {!isProcessing && (
          <div className="mt-6 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                  : selectedFile
                  ? "border-indigo-400/80 bg-indigo-50/20 dark:bg-slate-800/40"
                  : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.webm"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileChange(e.target.files[0])
                }
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    <FileAudio className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate max-w-md">
                      {selectedFile.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Taille : {formatBytes(selectedFile.size)}</span>
                      {audioDuration !== null && (
                        <span>• Durée : {formatTime(audioDuration)}</span>
                      )}
                      <span>• Type : {selectedFile.name.split(".").pop()?.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 underline font-medium pt-1">
                    Cliquer pour changer de fichier
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Glissez-déposez votre fichier audio ici, ou{" "}
                      <span className="text-indigo-600 dark:text-indigo-400 underline">
                        parcourez vos fichiers
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Formats supportés : <strong>MP3, WAV, FLAC, M4A, OGG</strong> (jusqu'à 1 heure d'enregistrement)
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadDemoAudio();
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors"
                    >
                      <Play className="w-3 h-3 mr-1.5 fill-current" />
                      Tester avec un fichier démo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Transcription Configuration Options */}
            {selectedFile && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Languages className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Langue parlée dans l'audio</span>
                  </label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="auto">Détection automatique (recommandé)</option>
                    <option value="fr">Français (France / International)</option>
                    <option value="en">Anglais (US / UK)</option>
                    <option value="es">Espagnol</option>
                    <option value="de">Allemand</option>
                    <option value="it">Italien</option>
                    <option value="pt">Portugais</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    La transcription sera générée fidèlement dans la même langue que l'audio.
                  </p>
                </div>

                {/* Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectSpeakers}
                      onChange={(e) => setDetectSpeakers(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Identifier les locuteurs
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Diarisation (Intervenant 1, Intervenant 2...)
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiEnhance}
                      onChange={(e) => setAiEnhance(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Amélioration IA de la netteté
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Ponctuation impeccable, filtre les hésitations
                      </span>
                    </div>
                  </label>
                </div>

                {/* Long Audio Warning / Notice */}
                {audioDuration && audioDuration > 600 && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-start space-x-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                    <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Enregistrement long ({formatTime(audioDuration)}) :
                      </span>{" "}
                      Le fichier sera découpé en tranches de 10 minutes, transcrit partie par partie par l'IA, puis réassemblé avec horodatages continus.
                    </div>
                  </div>
                )}

                {/* Start Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    id="start-transcription-btn"
                    onClick={handleLaunch}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Lancer la transcription</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="mt-8 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-lg shadow-indigo-600/30">
              <FileAudio className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {progressMessage || "Transcription en cours..."}
              </h3>
              {totalChunks && totalChunks > 1 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Tranche de 10 min : {currentChunk || 1} sur {totalChunks}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mx-auto space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Progression globale</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Découpage en parties de 10 min puis transcription verbatim de haute précision dans la langue de l'enregistrement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
