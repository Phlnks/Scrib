// @ts-ignore
import mammoth from "mammoth";
import { TranscriptSegment } from "../types";

export interface ParsedTranscriptResult {
  fileName: string;
  formatDetected: string;
  segments: TranscriptSegment[];
  fullText: string;
  estimatedDuration: number;
  wordCount: number;
  detectedLanguage?: string;
}

/**
 * Convert timestamp strings (HH:MM:SS.mmm, MM:SS.mmm, HH:MM:SS, etc.) to seconds
 */
export function parseTimestampToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(",", ".");
  // Regex matching HH:MM:SS.mmm or MM:SS.mmm or SS.mmm
  const parts = clean.split(":");
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return h * 3600 + m * 60 + s;
    }
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (!isNaN(m) && !isNaN(s)) {
      return m * 60 + s;
    }
  } else if (parts.length === 1) {
    const s = parseFloat(parts[0]);
    if (!isNaN(s)) return s;
  }
  return null;
}

/**
 * Strip HTML tags and subtitle markup from cue text
 */
function cleanSubtitleText(raw: string): { speaker: string; text: string } {
  let cleaned = raw
    .replace(/<[^>]+>/g, " ") // remove HTML tags like <b>, </i>
    .replace(/\{[^\}]+\}/g, "") // remove SSA/ASS override tags like {\b1}
    .replace(/\s+/g, " ")
    .trim();

  // Check for WebVTT voice tags like <v Speaker> or [Speaker] or Speaker:
  let speaker = "Interlocuteur 1";

  // Case 1: <v Speaker Name> or <v.loud Speaker>
  const vttVoiceMatch = raw.match(/<v(?:\.[^>]+)?\s+([^>]+)>/i);
  if (vttVoiceMatch) {
    speaker = vttVoiceMatch[1].trim();
  }

  // Case 2: [Speaker Name] Text or (Speaker Name) Text
  const bracketMatch = cleaned.match(/^(?:\[|\()([A-Za-zÀ-ÿ0-9_\s\.\-]{2,35})(?:\]|\))\s*[:\-–]?\s*(.*)$/);
  if (bracketMatch) {
    speaker = bracketMatch[1].trim();
    cleaned = bracketMatch[2].trim();
  } else {
    // Case 3: "Speaker Name:" or "Interlocuteur 1 :"
    const colonMatch = cleaned.match(/^([A-Za-zÀ-ÿ0-9_\s\.\-]{2,30})\s*:\s*(.+)$/);
    if (colonMatch && !colonMatch[1].toLowerCase().startsWith("http")) {
      speaker = colonMatch[1].trim();
      cleaned = colonMatch[2].trim();
    }
  }

  return { speaker: speaker || "Interlocuteur 1", text: cleaned };
}

/**
 * Parse SubRip (.srt) files
 */
export function parseSRT(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n+/);
  const segments: TranscriptSegment[] = [];

  const timeRegex = /(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}|\d{1,2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}|\d{1,2}:\d{2}[,\.]\d{1,3})/;

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let timeLineIdx = -1;
    let match: RegExpMatchArray | null = null;

    for (let l = 0; l < Math.min(lines.length, 3); l++) {
      match = lines[l].match(timeRegex);
      if (match) {
        timeLineIdx = l;
        break;
      }
    }

    if (!match || timeLineIdx === -1) continue;

    const startSec = parseTimestampToSeconds(match[1]) ?? 0;
    const endSec = parseTimestampToSeconds(match[2]) ?? startSec + 3;

    const rawText = lines.slice(timeLineIdx + 1).join(" ");
    if (!rawText.trim()) continue;

    const { speaker, text } = cleanSubtitleText(rawText);
    if (text) {
      segments.push({
        id: `seg_srt_${i}_${Date.now()}`,
        start: Math.round(startSec * 10) / 10,
        end: Math.round(endSec * 10) / 10,
        speaker,
        text,
      });
    }
  }

  return segments;
}

/**
 * Parse WebVTT (.vtt) files
 */
export function parseVTT(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const segments: TranscriptSegment[] = [];

  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{1,3})/;

  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let currentTextLines: string[] = [];
  let segIndex = 0;

  const flushCurrent = () => {
    if (currentStart !== null && currentEnd !== null && currentTextLines.length > 0) {
      const rawText = currentTextLines.join(" ");
      const { speaker, text } = cleanSubtitleText(rawText);
      if (text) {
        segments.push({
          id: `seg_vtt_${segIndex++}_${Date.now()}`,
          start: Math.round(currentStart * 10) / 10,
          end: Math.round(currentEnd * 10) / 10,
          speaker,
          text,
        });
      }
    }
    currentStart = null;
    currentEnd = null;
    currentTextLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushCurrent();
      continue;
    }

    if (line.startsWith("WEBVTT") || line.startsWith("NOTE") || line.startsWith("STYLE")) {
      continue;
    }

    const match = line.match(timeRegex);
    if (match) {
      flushCurrent();
      currentStart = parseTimestampToSeconds(match[1]);
      currentEnd = parseTimestampToSeconds(match[2]);
    } else if (currentStart !== null) {
      currentTextLines.push(line);
    }
  }

  flushCurrent();
  return segments;
}

/**
 * Parse JSON transcript formats (Whisper, Zoom, Otter, custom array)
 */
export function parseJSON(content: string): TranscriptSegment[] {
  const data = JSON.parse(content);
  const segments: TranscriptSegment[] = [];

  const rawList: any[] = Array.isArray(data)
    ? data
    : data.segments || data.utterances || data.cues || data.transcript || data.items || [];

  if (Array.isArray(rawList) && rawList.length > 0) {
    rawList.forEach((item, idx) => {
      const text =
        item.text || item.transcript || item.content || item.sentence || item.words?.map((w: any) => w.word || w.text).join(" ") || "";
      if (!text || typeof text !== "string" || !text.trim()) return;

      let start = 0;
      let end = 0;

      if (typeof item.start === "number") start = item.start;
      else if (typeof item.startTime === "number") start = item.startTime;
      else if (typeof item.start_time === "number") start = item.start_time;
      else if (typeof item.start === "string") start = parseTimestampToSeconds(item.start) ?? 0;
      else if (typeof item.startTime === "string") start = parseTimestampToSeconds(item.startTime) ?? 0;

      if (typeof item.end === "number") end = item.end;
      else if (typeof item.endTime === "number") end = item.endTime;
      else if (typeof item.end_time === "number") end = item.end_time;
      else if (typeof item.end === "string") end = parseTimestampToSeconds(item.end) ?? start + 3;
      else if (typeof item.endTime === "string") end = parseTimestampToSeconds(item.endTime) ?? start + 3;

      if (end <= start) end = start + Math.max(2, Math.ceil(text.split(/\s+/).length * 0.4));

      const speaker =
        item.speaker ||
        item.speaker_name ||
        item.speakerName ||
        item.speakerLabel ||
        (item.speaker_id !== undefined ? `Interlocuteur ${item.speaker_id}` : undefined) ||
        cleanSubtitleText(text).speaker ||
        "Interlocuteur 1";

      const cleanedText = cleanSubtitleText(text).text;

      segments.push({
        id: `seg_json_${idx}_${Date.now()}`,
        start: Math.round(start * 10) / 10,
        end: Math.round(end * 10) / 10,
        speaker,
        text: cleanedText,
      });
    });
  } else if (typeof data === "object") {
    // If json has full text field: text, fullText, transcript
    const singleText = data.text || data.fullText || data.transcription || data.content;
    if (typeof singleText === "string" && singleText.trim()) {
      return parsePlainText(singleText);
    }
  }

  return segments;
}

/**
 * Parse CSV / TSV formats
 */
export function parseCSV(content: string, delimiter?: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const sep = delimiter || (lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",");
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const startCol = headers.findIndex((h) => h.includes("start") || h.includes("debut") || h.includes("time") || h === "t");
  const endCol = headers.findIndex((h) => h.includes("end") || h.includes("fin"));
  const speakerCol = headers.findIndex((h) => h.includes("speaker") || h.includes("locuteur") || h.includes("nom") || h.includes("author"));
  const textCol = headers.findIndex((h) => h.includes("text") || h.includes("texte") || h.includes("content") || h.includes("transcript") || h.includes("message"));

  const segments: TranscriptSegment[] = [];
  let currentTime = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawRow = lines[i];
    // Split by sep handling basic quotes
    const cells = rawRow.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cells.length < 1) continue;

    const text = (textCol !== -1 ? cells[textCol] : cells[cells.length - 1]) || "";
    if (!text) continue;

    let start = currentTime;
    if (startCol !== -1 && cells[startCol]) {
      const parsed = parseTimestampToSeconds(cells[startCol]);
      if (parsed !== null) start = parsed;
    }

    let end = start + Math.max(2, Math.ceil(text.split(/\s+/).length * 0.4));
    if (endCol !== -1 && cells[endCol]) {
      const parsed = parseTimestampToSeconds(cells[endCol]);
      if (parsed !== null) end = parsed;
    }

    currentTime = end;

    let speaker = "Interlocuteur 1";
    if (speakerCol !== -1 && cells[speakerCol]) {
      speaker = cells[speakerCol];
    } else {
      speaker = cleanSubtitleText(text).speaker;
    }

    segments.push({
      id: `seg_csv_${i}_${Date.now()}`,
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      speaker,
      text: cleanSubtitleText(text).text,
    });
  }

  return segments;
}

/**
 * Parse plain text (.txt, .md, Word docx converted to text)
 * Smartly detects timestamps [00:01:23], speakers (Alice: ...), and splits into readable paragraphs.
 */
export function parsePlainText(content: string): TranscriptSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawParagraphs = normalized.split(/\n\s*\n+/);
  const segments: TranscriptSegment[] = [];

  let currentTime = 0;
  let defaultSpeaker = "Interlocuteur 1";
  let segIndex = 0;

  // Check if content has timestamped lines
  const timestampLineRegex = /^(?:\[|\()?((?:\d{1,2}:)?\d{2}:\d{2}(?:[,\.]\d{1,3})?)(?:\]|\))?\s*[-–:]?\s*(.*)$/;

  for (const block of rawParagraphs) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Split block into lines
    const lines = trimmedBlock.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (!line) continue;

      // Check for timestamp at beginning of line: "[00:01:23] Speaker: text"
      const tsMatch = line.match(timestampLineRegex);
      let lineText = line;
      let lineStart = currentTime;

      if (tsMatch) {
        const parsedTime = parseTimestampToSeconds(tsMatch[1]);
        if (parsedTime !== null) {
          lineStart = parsedTime;
        }
        lineText = tsMatch[2].trim();
      }

      if (!lineText) continue;

      const { speaker, text } = cleanSubtitleText(lineText);
      const effectiveSpeaker = speaker !== "Interlocuteur 1" ? speaker : defaultSpeaker;
      if (speaker !== "Interlocuteur 1") {
        defaultSpeaker = speaker;
      }

      const wordCount = text.split(/\s+/).length;
      const duration = Math.max(3, Math.round(wordCount * 0.45));
      const lineEnd = lineStart + duration;
      currentTime = lineEnd;

      segments.push({
        id: `seg_txt_${segIndex++}_${Date.now()}`,
        start: Math.round(lineStart * 10) / 10,
        end: Math.round(lineEnd * 10) / 10,
        speaker: effectiveSpeaker,
        text,
      });
    }
  }

  // If blocks were huge with no line breaks, chunk them down gracefully
  if (segments.length === 1 && segments[0].text.length > 500) {
    return chunkLongTextIntoSegments(segments[0].text);
  }

  return segments;
}

/**
 * Split a single very long string into coherent paragraph segments of 40-70 words
 */
function chunkLongTextIntoSegments(longText: string): TranscriptSegment[] {
  const sentences = longText.match(/[^.!?]+[.!?]+|\S+/g) || [longText];
  const segments: TranscriptSegment[] = [];
  let currentWords: string[] = [];
  let currentTime = 0;
  let idx = 0;

  for (const sentence of sentences) {
    currentWords.push(sentence.trim());
    const totalWordCount = currentWords.join(" ").split(/\s+/).length;

    if (totalWordCount >= 40) {
      const text = currentWords.join(" ");
      const dur = Math.max(3, Math.round(totalWordCount * 0.45));
      segments.push({
        id: `seg_chunk_${idx++}_${Date.now()}`,
        start: Math.round(currentTime * 10) / 10,
        end: Math.round((currentTime + dur) * 10) / 10,
        speaker: "Interlocuteur 1",
        text,
      });
      currentTime += dur;
      currentWords = [];
    }
  }

  if (currentWords.length > 0) {
    const text = currentWords.join(" ");
    const wordCount = text.split(/\s+/).length;
    const dur = Math.max(3, Math.round(wordCount * 0.45));
    segments.push({
      id: `seg_chunk_${idx++}_${Date.now()}`,
      start: Math.round(currentTime * 10) / 10,
      end: Math.round((currentTime + dur) * 10) / 10,
      speaker: "Interlocuteur 1",
      text,
    });
  }

  return segments;
}

/**
 * Master parser: inspect file extension and content to parse into unified segments
 */
export async function parseTranscriptFile(file: File): Promise<ParsedTranscriptResult> {
  const fileName = file.name;
  const ext = "." + fileName.split(".").pop()?.toLowerCase();

  let segments: TranscriptSegment[] = [];
  let formatDetected = "Texte brut (.txt)";

  if (ext === ".srt") {
    formatDetected = "Sous-titres SubRip (.srt)";
    const text = await file.text();
    segments = parseSRT(text);
  } else if (ext === ".vtt") {
    formatDetected = "Sous-titres WebVTT (.vtt)";
    const text = await file.text();
    segments = parseVTT(text);
  } else if (ext === ".json") {
    formatDetected = "Données structurées JSON (.json)";
    const text = await file.text();
    segments = parseJSON(text);
  } else if (ext === ".csv" || ext === ".tsv") {
    formatDetected = ext === ".csv" ? "Tableau CSV (.csv)" : "Tableau TSV (.tsv)";
    const text = await file.text();
    segments = parseCSV(text, ext === ".tsv" ? "\t" : undefined);
  } else if (ext === ".docx") {
    formatDetected = "Document Microsoft Word (.docx)";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer });
      const rawText = res.value || "";
      segments = parsePlainText(rawText);
    } catch (e: any) {
      console.warn("Mammoth docx parse fallback:", e);
      throw new Error("Impossible de lire ce document Word (.docx) : " + e.message);
    }
  } else {
    // .txt, .md, or other text extensions
    formatDetected = ext === ".md" ? "Markdown (.md)" : "Texte brut (.txt)";
    const text = await file.text();

    // Quick auto-detection if content actually starts with WEBVTT or SRT numbering
    if (text.trim().startsWith("WEBVTT")) {
      formatDetected = "Sous-titres WebVTT (.vtt)";
      segments = parseVTT(text);
    } else if (/^\d+\s*\n\d{1,2}:\d{2}/.test(text.trim())) {
      formatDetected = "Sous-titres SubRip (.srt)";
      segments = parseSRT(text);
    } else {
      try {
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const jsonSegs = parseJSON(text);
          if (jsonSegs.length > 0) {
            formatDetected = "Données JSON (.json)";
            segments = jsonSegs;
          } else {
            segments = parsePlainText(text);
          }
        } else {
          segments = parsePlainText(text);
        }
      } catch {
        segments = parsePlainText(text);
      }
    }
  }

  if (segments.length === 0) {
    throw new Error("Aucun texte ou segment n'a pu être extrait de ce fichier de transcription.");
  }

  const fullText = segments.map((s) => s.text).join(" ");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const lastSeg = segments[segments.length - 1];
  const estimatedDuration = lastSeg ? Math.max(10, Math.round(lastSeg.end)) : Math.round((wordCount / 130) * 60);

  return {
    fileName,
    formatDetected,
    segments,
    fullText,
    estimatedDuration,
    wordCount,
  };
}
