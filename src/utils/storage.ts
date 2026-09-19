import { AudioFileItem, UserSettings } from "../types";

const DB_NAME = "AudioTranscribeDB";
const DB_VERSION = 1;
const STORE_METADATA = "transcripts_metadata";
const STORE_BLOBS = "audio_blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
  });
}

export async function saveAudioFileItem(
  item: AudioFileItem,
  audioBlob?: Blob
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_METADATA, STORE_BLOBS], "readwrite");

  const metaStore = tx.objectStore(STORE_METADATA);
  metaStore.put(item);

  if (audioBlob) {
    const blobStore = tx.objectStore(STORE_BLOBS);
    blobStore.put(audioBlob, item.id);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllAudioFileItems(): Promise<AudioFileItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_METADATA, "readonly");
    const store = tx.objectStore(STORE_METADATA);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as AudioFileItem[]) || [];
      // Sort newest first
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readonly");
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioFileItem(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_METADATA, STORE_BLOBS], "readwrite");
  tx.objectStore(STORE_METADATA).delete(id);
  tx.objectStore(STORE_BLOBS).delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// User settings in localStorage
const SETTINGS_KEY = "audio_transcribe_settings_v1";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: "base",
  showTimestamps: true,
  showSpeakers: true,
  showTranslation: false,
  translationViewMode: "original",
  chunkDurationMinutes: 10,
  aiEnhancement: true,
  autoScroll: true,
  defaultTargetLang: "none",
};

export function loadUserSettings(): UserSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load user settings:", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save user settings:", e);
  }
}
