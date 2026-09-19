import { AudioChunk } from "../types";

/**
 * Reads audio file metadata (duration in seconds) using HTMLAudioElement
 */
export function getAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.src = url;

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(url);
      resolve(isFinite(dur) && dur > 0 ? dur : 0);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

/**
 * Converts a Blob to a base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Encodes Float32Array PCM samples to 16-bit PCM WAV Blob at specified sample rate
 */
function encodeWav(
  samples: Float32Array,
  sampleRate: number = 16000
): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Resamples an AudioBuffer to 16kHz mono Float32Array
 */
async function resampleTo16kMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetSampleRate = 16000;
  const numChannels = audioBuffer.numberOfChannels;
  const originalLength = audioBuffer.length;
  const originalSampleRate = audioBuffer.sampleRate;

  // Mix down to mono first if stereo/multi-channel
  const monoSamples = new Float32Array(originalLength);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < originalLength; i++) {
      monoSamples[i] += channelData[i] / numChannels;
    }
  }

  if (originalSampleRate === targetSampleRate) {
    return monoSamples;
  }

  // Use OfflineAudioContext for high-fidelity resampling
  const duration = audioBuffer.duration;
  const targetLength = Math.ceil(duration * targetSampleRate);
  const offlineCtx = new (window.OfflineAudioContext ||
    (window as any).webkitOfflineAudioContext)(
    1,
    targetLength,
    targetSampleRate
  );

  const bufferSource = offlineCtx.createBufferSource();
  const tempBuffer = offlineCtx.createBuffer(
    1,
    originalLength,
    originalSampleRate
  );
  tempBuffer.getChannelData(0).set(monoSamples);
  bufferSource.buffer = tempBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

/**
 * Slices an audio file into 10-minute chunks (600 seconds)
 * Ensures smooth processing for recordings up to 1 hour and more.
 */
export async function chunkAudioFile(
  file: File | Blob,
  chunkDurationSec: number = 600, // 10 minutes default
  onProgress?: (msg: string, percent: number) => void
): Promise<AudioChunk[]> {
  onProgress?.("Étape 1/2 : Analyse et vérification du format audio...", 10);

  let duration = await getAudioDuration(file);
  const mimeType = file.type || "audio/mp3";

  // If audio is under 10 minutes (600s) and reasonably sized (< 20MB), single chunk
  if (duration > 0 && duration <= chunkDurationSec && file.size < 20 * 1024 * 1024) {
    onProgress?.("Étape 1/2 : Audio court (< 10 min), préparation directe...", 50);
    const base64 = await blobToBase64(file);
    onProgress?.("Étape 1/2 : Découpage terminé (1 seule tranche nécessaire).", 100);
    return [
      {
        index: 0,
        total: 1,
        startTime: 0,
        endTime: duration,
        blob: file,
        base64,
        mimeType,
      },
    ];
  }

  onProgress?.("Étape 1/2 : Décodage du flux audio pour découpage...", 20);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    duration = decodedBuffer.duration;
    onProgress?.("Étape 1/2 : Rééchantillonnage vocal 16 kHz haute précision...", 40);

    const monoSamples = await resampleTo16kMono(decodedBuffer);
    const targetSampleRate = 16000;
    const samplesPerChunk = chunkDurationSec * targetSampleRate;
    const totalChunks = Math.ceil(monoSamples.length / samplesPerChunk);

    const chunks: AudioChunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const startSample = i * samplesPerChunk;
      const endSample = Math.min(monoSamples.length, (i + 1) * samplesPerChunk);
      const chunkSamples = monoSamples.slice(startSample, endSample);

      const startTime = startSample / targetSampleRate;
      const endTime = endSample / targetSampleRate;

      onProgress?.(
        `Étape 1/2 : Création de la tranche ${i + 1}/${totalChunks} (de ${formatTime(
          startTime
        )} à ${formatTime(endTime)})...`,
        40 + Math.round(((i + 1) / totalChunks) * 55)
      );

      const wavBlob = encodeWav(chunkSamples, targetSampleRate);
      const base64 = await blobToBase64(wavBlob);

      chunks.push({
        index: i,
        total: totalChunks,
        startTime,
        endTime,
        blob: wavBlob,
        base64,
        mimeType: "audio/wav",
      });
    }

    audioCtx.close();
    onProgress?.(`Étape 1/2 : Découpage terminé (${totalChunks} parties de 10 min prêtes).`, 100);
    return chunks;
  } catch (err) {
    console.warn("AudioContext decode failed, falling back to Blob slicing:", err);
    // Fallback: slice raw blob into byte blocks proportional to 10 minutes
    onProgress?.("Étape 1/2 : Découpage par blocs de fichier...", 50);

    const targetChunkBytes = 15 * 1024 * 1024; // 15MB per slice
    const totalChunks = Math.max(1, Math.ceil(file.size / targetChunkBytes));
    const estChunkDuration = duration > 0 ? duration / totalChunks : 600;

    const chunks: AudioChunk[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const startByte = i * targetChunkBytes;
      const endByte = Math.min(file.size, (i + 1) * targetChunkBytes);
      const sliceBlob = file.slice(startByte, endByte, mimeType);
      const base64 = await blobToBase64(sliceBlob);

      const startTime = i * estChunkDuration;
      const endTime = Math.min(duration || (i + 1) * estChunkDuration, (i + 1) * estChunkDuration);

      chunks.push({
        index: i,
        total: totalChunks,
        startTime,
        endTime,
        blob: sliceBlob,
        base64,
        mimeType,
      });
    }

    onProgress?.(`Étape 1/2 : Découpage terminé (${totalChunks} tranches prêtes).`, 100);
    return chunks;
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = String(m).padStart(2, "0");
  const sStr = String(s).padStart(2, "0");

  if (h > 0) {
    const hStr = String(h).padStart(2, "0");
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

/**
 * Format byte count to human readable (MB, KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
