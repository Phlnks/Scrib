import jsPDF from "jspdf";
import { AudioFileItem, TranscriptSegment } from "../types";
import { formatTime } from "./audioProcessor";

export interface ExportOptions {
  includeTimestamps: boolean;
  includeSpeakers: boolean;
  includeTranslation: boolean;
  includeSummary: boolean;
}

/**
 * Generates a clean plain text string according to export options
 */
export function generatePlainText(
  item: AudioFileItem,
  options: ExportOptions
): string {
  let content = `TRANSCRIPTION REPORT\n`;
  content += `=====================================\n`;
  content += `File: ${item.name}\n`;
  content += `Date: ${new Date(item.createdAt).toLocaleString()}\n`;
  content += `Duration: ${formatTime(item.duration)}\n`;
  if (item.detectedLanguage) {
    content += `Language: ${item.detectedLanguage}\n`;
  }
  content += `=====================================\n\n`;

  if (options.includeSummary && (item.summary || item.translatedSummary)) {
    const formatLabel =
      item.summaryFormat === "concise"
        ? "Léger / Concis"
        : item.summaryFormat === "bullet_points"
        ? "Points clés à puces"
        : item.summaryFormat === "meeting_minutes"
        ? "Compte-rendu de réunion"
        : "Détaillé";

    content += `EXECUTIVE SUMMARY [Format: ${formatLabel}]\n`;
    content += `-----------------\n`;
    content += `${item.summary}\n\n`;

    if (item.translatedSummary) {
      content += `TRANSLATED SUMMARY (${(item.translatedSummaryLanguage || "en").toUpperCase()}):\n`;
      content += `-----------------\n`;
      content += `${item.translatedSummary}\n\n`;
    }

    if (item.highlights && item.highlights.length > 0) {
      content += `KEY HIGHLIGHTS:\n`;
      item.highlights.forEach((h) => (content += `• ${h}\n`));
      content += `\n`;
    }

    if (item.actionItems && item.actionItems.length > 0) {
      content += `ACTION ITEMS:\n`;
      item.actionItems.forEach((a) => (content += `[ ] ${a}\n`));
      content += `\n`;
    }
    content += `=====================================\n\n`;
  }

  content += `TRANSCRIPT\n`;
  content += `-----------------\n`;

  item.segments.forEach((seg) => {
    let line = "";
    if (options.includeTimestamps) {
      line += `[${formatTime(seg.start)} - ${formatTime(seg.end)}] `;
    }
    if (options.includeSpeakers && seg.speaker) {
      line += `${seg.speaker}: `;
    }
    line += `${seg.text}\n`;

    if (options.includeTranslation && seg.translation) {
      line += `  ↳ Translation: ${seg.translation}\n`;
    }
    line += `\n`;
    content += line;
  });

  return content;
}

/**
 * Trigger browser download for a string as a text file
 */
export function downloadTxt(item: AudioFileItem, options: ExportOptions): void {
  const text = generatePlainText(item, options);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const baseName = item.name.replace(/\.[^/.]+$/, "");
  a.href = url;
  a.download = `${baseName}_transcript.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download formatted PDF with jsPDF
 */
export function downloadPdf(item: AudioFileItem, options: ExportOptions): void {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const baseName = item.name.replace(/\.[^/.]+$/, "");

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 150);
    doc.text(`Scrib • ${baseName}`, margin, 10);
    doc.text(
      `Page ${doc.getNumberOfPages()}`,
      pageWidth - margin,
      10,
      { align: "right" }
    );
    doc.setDrawColor(225, 230, 235);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // Initial header on first page
  drawHeader();
  y = 20;

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(25, 30, 40);
  doc.text("Audio Transcript & Translation", margin, y);
  y += 7;

  // Metadata Card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 100);
  doc.text(`File: ${item.name}`, margin + 4, y + 6);
  doc.text(
    `Duration: ${formatTime(item.duration)}`,
    margin + contentWidth / 2,
    y + 6
  );
  doc.text(
    `Date: ${new Date(item.createdAt).toLocaleDateString()}`,
    margin + 4,
    y + 12
  );
  doc.text(
    `Language: ${item.detectedLanguage || item.sourceLanguage || "Auto"}`,
    margin + contentWidth / 2,
    y + 12
  );
  y += 24;

  // Executive Summary Section (if enabled and available)
  if (options.includeSummary && (item.summary || item.translatedSummary)) {
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);

    const formatLabel =
      item.summaryFormat === "concise"
        ? "Format: Léger"
        : item.summaryFormat === "bullet_points"
        ? "Format: Points clés"
        : item.summaryFormat === "meeting_minutes"
        ? "Format: Compte-rendu"
        : "Format: Détaillé";

    doc.text(`Executive Summary (${formatLabel})`, margin, y);
    y += 5;

    if (item.summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const summaryLines = doc.splitTextToSize(item.summary, contentWidth);
      summaryLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 4;
    }

    if (item.translatedSummary) {
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(16, 116, 80);
      doc.text(
        `Translated Summary (${(item.translatedSummaryLanguage || "en").toUpperCase()}):`,
        margin,
        y
      );
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const transLines = doc.splitTextToSize(item.translatedSummary, contentWidth);
      transLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 4;
    }

    if (item.highlights && item.highlights.length > 0) {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Key Highlights:", margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      item.highlights.forEach((h) => {
        const bulletLines = doc.splitTextToSize(`• ${h}`, contentWidth - 4);
        bulletLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 4, y);
          y += 4.5;
        });
      });
      y += 4;
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  }

  // Transcript header
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Full Transcript", margin, y);
  y += 6;

  // Segments
  item.segments.forEach((seg) => {
    checkPageBreak(16);

    let headerParts: string[] = [];
    if (options.includeTimestamps) {
      headerParts.push(`[${formatTime(seg.start)} - ${formatTime(seg.end)}]`);
    }
    if (options.includeSpeakers && seg.speaker) {
      headerParts.push(seg.speaker);
    }

    if (headerParts.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(headerParts.join(" • "), margin, y);
      y += 4.5;
    }

    // Original text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const textLines = doc.splitTextToSize(seg.text, contentWidth);
    textLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.8;
    });

    // Translation (if requested)
    if (options.includeTranslation && seg.translation) {
      y += 1;
      checkPageBreak(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229); // indigo tone for translation
      const transLines = doc.splitTextToSize(`↳ ${seg.translation}`, contentWidth - 4);
      transLines.forEach((line: string) => {
        checkPageBreak(4.5);
        doc.text(line, margin + 4, y);
        y += 4.5;
      });
    }

    y += 3.5;
  });

  doc.save(`${baseName}_transcript.pdf`);
}

/**
 * Generate SRT subtitle format
 */
export function downloadSrt(item: AudioFileItem): void {
  const formatSrtTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };

  let srt = "";
  item.segments.forEach((seg, idx) => {
    srt += `${idx + 1}\n`;
    srt += `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n`;
    if (seg.speaker) {
      srt += `[${seg.speaker}] `;
    }
    srt += `${seg.text}\n`;
    if (seg.translation) {
      srt += `(${seg.translation})\n`;
    }
    srt += `\n`;
  });

  const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const baseName = item.name.replace(/\.[^/.]+$/, "");
  a.href = url;
  a.download = `${baseName}_subtitles.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
