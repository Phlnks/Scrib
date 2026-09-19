import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
} from "lucide-react";
import { formatTime } from "../utils/audioProcessor";

interface AudioPlayerProps {
  audioBlob: Blob | null;
  audioUrl?: string;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  seekToTime?: number | null;
  onSeekHandled?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  audioUrl,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationChange,
  seekToTime,
  onSeekHandled,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [internalUrl, setInternalUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Generate URL for blob if provided
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setInternalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (audioUrl) {
      setInternalUrl(audioUrl);
    }
  }, [audioBlob, audioUrl]);

  // Handle external seek request (e.g. clicking on a segment)
  useEffect(() => {
    if (
      seekToTime !== null &&
      seekToTime !== undefined &&
      audioRef.current &&
      !isNaN(seekToTime)
    ) {
      audioRef.current.currentTime = seekToTime;
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      onSeekHandled?.();
    }
  }, [seekToTime, onSeekHandled]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur && isFinite(dur) && onDurationChange) {
        onDurationChange(dur);
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      onTimeUpdate(val);
    }
  };

  const skipSeconds = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioRef.current.duration || duration, audioRef.current.currentTime + sec)
      );
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!internalUrl) {
    return (
      <div className="shrink-0 border-t bg-white/95 dark:bg-slate-950/95 border-slate-200 dark:border-slate-800 px-4 py-3 shadow-lg transition-colors z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
            <Volume2 className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Chargement du fichier audio...</span>
          </div>
          {duration > 0 && (
            <span className="font-mono text-[11px] text-slate-400">
              {formatTime(duration)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t bg-white/95 dark:bg-slate-950/95 border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 py-3 shadow-lg transition-colors z-20">
      <audio
        ref={audioRef}
        src={internalUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="max-w-5xl mx-auto flex flex-col space-y-2">
        {/* Scrubber & Time */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>

          <div className="relative flex-1 group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
          </div>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Changer la vitesse de lecture"
            >
              <Gauge className="w-3.5 h-3.5 text-indigo-500" />
              <span>{playbackRate}x</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Center Playback Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => skipSeconds(-5)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reculer de 5 secondes"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(5)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Avancer de 5 secondes"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cliquez sur un texte pour caler l'audio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
