import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Gemini Client with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "scrib-transcription",
    },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resilient Gemini caller with exponential backoff & automatic model fallback.
 * Uses exclusively the ultra-fast, high-availability Flash-Lite model family:
 * 1. gemini-flash-lite-latest (fastest & continuously updated)
 * 2. gemini-3.5-flash-lite (high throughput & stable audio transcription)
 * 3. gemini-3.1-flash-lite (reliable fallback with 0 demand issues)
 * Completely eliminates heavy models prone to 503 capacity saturation.
 */
async function generateContentWithRetry(
  options: {
    models?: string[];
    contents: any[];
    config?: any;
  },
  maxRetriesPerModel = 3
) {
  const candidateModels = options.models && options.models.length > 0
    ? options.models
    : ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini] Attempting model "${model}" (attempt ${attempt}/${maxRetriesPerModel})...`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        console.log(`[Gemini] Model "${model}" responded successfully.`);
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const status = err?.status || err?.code;
        const isTemporaryCapacityIssue =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("overloaded") ||
          status === 503 ||
          status === 429;

        console.warn(`[Gemini] Model "${model}" attempt ${attempt} warning:`, msg);

        // If it's a 404 (model not found / deprecated), skip immediately to the next candidate model
        if (status === 404 || msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("no longer available")) {
          console.warn(`[Gemini] Model "${model}" is no longer available (404), skipping to next candidate model...`);
          break;
        }

        if (isTemporaryCapacityIssue && attempt < maxRetriesPerModel) {
          // Exponential backoff: 2s, 4s, 6s... + jitter
          const waitTime = attempt * 2000 + Math.floor(Math.random() * 500);
          console.log(`[Gemini] Temporary high demand on "${model}". Retrying in ${waitTime}ms...`);
          await sleep(waitTime);
          continue;
        }

        // If capacity issue persists on this model and we have another candidate model, switch
        if (isTemporaryCapacityIssue && mIdx < candidateModels.length - 1) {
          console.log(`[Gemini] Model "${model}" at capacity, switching to fallback "${candidateModels[mIdx + 1]}"...`);
          await sleep(1000);
          break; // proceed to next candidateModel
        }

        if (!isTemporaryCapacityIssue) {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";
  const bodyLimit = process.env.BODY_LIMIT || "75mb";

  // Trust reverse proxy headers (Nginx, Traefik, Caddy, Cloudflare) when behind a domain
  if (
    process.env.TRUST_PROXY === "true" ||
    process.env.TRUST_PROXY === "1" ||
    process.env.NODE_ENV === "production"
  ) {
    app.set("trust proxy", 1);
  }

  // Body parser with configurable limit for large audio chunks / files
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Transcribe a single audio chunk (or complete file)
  app.post("/api/transcribe-chunk", async (req: Request, res: Response) => {
    try {
      const {
        audioData,
        mimeType = "audio/mp3",
        timeOffset = 0,
        sourceLanguage = "auto",
        detectSpeakers = true,
        aiEnhance = true,
        chunkIndex = 0,
        totalChunks = 1,
      } = req.body;

      if (!audioData) {
        return res.status(400).json({ error: "Missing audioData (base64 string)" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured in environment.",
        });
      }

      const cleanMimeType = mimeType.split(";")[0].trim().toLowerCase();
      // Clean base64 header if included
      const rawBase64 = audioData.includes(",")
        ? audioData.split(",")[1]
        : audioData;

      let prompt = `Transcribe the provided audio faithfully and verbatim in the exact language spoken.`;
      prompt += `\nCRITICAL: Do NOT translate the text. Transcribe in the original spoken language of the speaker.`;
      prompt += `\nThis is chunk ${chunkIndex + 1} of ${totalChunks}, starting at timestamp ${timeOffset.toFixed(1)} seconds in the full recording.`;

      if (sourceLanguage && sourceLanguage !== "auto") {
        prompt += `\nThe spoken language is predominantly ${sourceLanguage}. Transcribe the dialogue faithfully in this language.`;
      } else {
        prompt += `\nDetect the spoken language automatically. Transcribe the dialogue in its authentic spoken language.`;
      }

      if (detectSpeakers) {
        prompt += `\nDistinguish different speakers (e.g., "Interlocuteur 1", "Interlocuteur 2", or person names if mentioned).`;
      }

      if (aiEnhance) {
        prompt += `\nFormat with appropriate punctuation, capitalization, and clear sentence structure. Filter out stutters or unintentional filler words ("euh", "um", "ah") for maximum readability while preserving every intended thought.`;
      }

      prompt += `\nCalculate the segment start and end times in seconds, ADDING the initial offset of ${timeOffset} seconds so all timestamps reflect the true position in the complete recording.`;

      const audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: rawBase64,
        },
      };

      const systemInstruction = `You are an expert audio transcription system.
Your mission is to output high-accuracy verbatim transcription in the original language spoken by the audio speakers.
Do NOT translate into another language.
Return ONLY valid JSON with this exact structure:
{
  "detectedLanguage": "string (e.g. Français, Anglais, Espagnol...)",
  "languageCode": "string (e.g. fr, en, es)",
  "segments": [
    {
      "start": number (start time in seconds with offset ${timeOffset}),
      "end": number (end time in seconds with offset ${timeOffset}),
      "speaker": "string (e.g. Interlocuteur 1)",
      "text": "transcribed speech in the original language"
    }
  ],
  "chunkSummary": "brief 1-sentence recap of this segment"
}`;

      const response = await generateContentWithRetry({
        models: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
        contents: [
          audioPart,
          {
            text: prompt,
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.15,
        },
      });

      const responseText = response.text || "{}";
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = {
            detectedLanguage: "Audio",
            segments: [
              {
                start: timeOffset,
                end: timeOffset + 10,
                speaker: "Interlocuteur 1",
                text: responseText,
              },
            ],
          };
        }
      }

      res.json({
        success: true,
        chunkIndex,
        timeOffset,
        data: parsedData,
      });
    } catch (err: any) {
      console.error("Transcribe chunk error:", err);
      res.status(500).json({
        error: err.message || "Failed to transcribe audio chunk",
      });
    }
  });

  // Comprehensive AI analysis (Executive summary in selectable formats: concise, detailed, bullet_points, meeting_minutes)
  app.post("/api/enhance-transcript", async (req: Request, res: Response) => {
    try {
      const { fullText, detectedLanguage = "Français", format = "detailed", duration } = req.body;

      if (!fullText) {
        return res.status(400).json({ error: "Missing fullText" });
      }

      const words = fullText.trim().split(/\s+/).filter(Boolean).length;
      // Estimate audio duration in minutes if duration in seconds was provided or infer from ~130 words/min
      const estimatedMinutes = duration && typeof duration === "number" && duration > 0
        ? Math.round(duration / 60)
        : Math.round(words / 130);

      let formatInstructions = "";
      switch (format) {
        case "concise":
          formatInstructions = `Provide a concise, punchy executive summary (1-2 short paragraphs, 4-6 sentences total) capturing the core essence without fluff.`;
          break;
        case "bullet_points":
          formatInstructions = `Provide a structured bullet-point summary where every key topic or theme is formatted with clear bullet points (•). Group logically by theme.`;
          break;
        case "meeting_minutes":
          formatInstructions = `Provide a formal meeting minutes style summary (Compte-rendu de réunion structuré):
- Contexte & ordre du jour
- Points clés abordés et débats
- Décisions prises & arbitrages
- Obstacles et points d'attention
- Prochaines étapes & responsabilités assignées.`;
          break;
        case "detailed":
        default:
          if (estimatedMinutes >= 60 || words >= 4000) {
            formatInstructions = `CRITICAL REQUIREMENT - EXTENSIVE DOSSIER DEPTH:
This is a long, in-depth recording (estimated duration: ~${estimatedMinutes} minutes, ${words} words). A standard 3-4 paragraph summary is strictly unacceptable.
You MUST provide an extensive, highly comprehensive, multi-section dossier that thoroughly reflects the full 1h+ / 1h30+ session:
- Structure with clear headings and thematic chapters (e.g. 1. Contexte général & Enjeux, 2. Analyse détaillée des thématiques & Débats majeurs, 3. Détails techniques, opérationnels et chiffrés, 4. Positions & arguments respectifs des interlocuteurs, 5. Décisions actées & Arbitrages, 6. Perspectives & Feuille de route).
- Develop every topic in full depth, preserving key arguments, concrete numbers, metrics, dates, names, hypotheses, and rationales.
- Ensure that no major phase of the audio is overlooked. The text must serve as a comprehensive executive reference dossier.`;
          } else if (estimatedMinutes >= 20 || words >= 1500) {
            formatInstructions = `LENGTH & DEPTH REQUIREMENT:
This is a medium-length recording (~${estimatedMinutes} minutes, ${words} words).
Provide an in-depth, structured synthesis (typically 5 to 8 detailed paragraphs or organized thematic sections) covering background, depth of discussion, all arguments, numbers/data, nuances, and conclusions in full detail.`;
          } else {
            formatInstructions = `Provide a thorough, comprehensive executive summary (3-5 rich paragraphs) covering context, depth of discussion, nuances, and conclusions.`;
          }
          break;
      }

      const prompt = `Analyze the following complete audio transcript.

Estimated duration: ~${estimatedMinutes} minutes (${words} words).

Formatting & Depth requirement:
${formatInstructions}

Also provide:
- Key points / highlights: provide an extensive list of takeaways (for long recordings, provide 8-15 distinct key points).
- Action items or decisions made: list all practical next steps, responsibilities, and decisions.
- Tone and topic tags.

Language requirement: Provide the entire response in ${detectedLanguage || "French"}.

Transcript:
"""
${fullText}
"""`;

      const response = await generateContentWithRetry({
        models: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "Executive summary formatted according to the requested format style",
              },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key points discussed",
              },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Action items or next steps",
              },
              topics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Keywords and topics",
              },
            },
            required: ["summary", "highlights"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, analysis: parsed, format });
    } catch (err: any) {
      console.error("Enhance transcript error:", err);
      res.status(500).json({
        error: err.message || "Failed to analyze transcript",
      });
    }
  });

  // Direct summary translation endpoint
  app.post("/api/translate-summary", async (req: Request, res: Response) => {
    try {
      const {
        summary,
        highlights = [],
        actionItems = [],
        targetLanguage = "en",
      } = req.body;

      if (!summary) {
        return res.status(400).json({ error: "Missing summary to translate" });
      }

      const langMap: Record<string, string> = {
        fr: "Français",
        en: "English",
        es: "Español",
        de: "Deutsch",
        it: "Italiano",
        pt: "Português",
        ar: "العربية",
        zh: "中文",
        ja: "日本語",
      };
      const targetLangName = langMap[targetLanguage] || targetLanguage;

      const prompt = `Translate the following executive summary, key highlights, and action items faithfully and completely into ${targetLangName}.
CRITICAL INSTRUCTIONS:
1. Translate "summary" into "translatedSummary".
2. Translate EVERY bullet item in "highlights" into "translatedHighlights" in ${targetLangName}. If "highlights" contains items, "translatedHighlights" MUST NOT be empty.
3. Translate EVERY action item in "actionItems" into "translatedActionItems" in ${targetLangName}. If "actionItems" contains items, "translatedActionItems" MUST NOT be empty.
4. Preserve tone, nuances, formatting, and exact meaning.

Data to translate:
${JSON.stringify({
  summary,
  highlights: highlights && highlights.length > 0 ? highlights : [],
  actionItems: actionItems && actionItems.length > 0 ? actionItems : [],
})}

Output JSON schema:
{
  "translatedSummary": string,
  "translatedHighlights": string[],
  "translatedActionItems": string[]
}`;

      const response = await generateContentWithRetry({
        models: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedSummary: { type: Type.STRING },
              translatedHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              translatedActionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["translatedSummary"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        success: true,
        translatedSummary: parsed.translatedSummary,
        translatedHighlights: parsed.translatedHighlights || [],
        translatedActionItems: parsed.translatedActionItems || [],
        targetLanguage,
      });
    } catch (err: any) {
      console.error("Translate summary error:", err);
      res.status(500).json({
        error: err.message || "Failed to translate summary",
      });
    }
  });

  // Translate complete transcript or segment list
  app.post("/api/translate-transcript", async (req: Request, res: Response) => {
    try {
      const { segments = [], targetLanguage = "en" } = req.body;

      if (!segments || segments.length === 0) {
        return res.status(400).json({ error: "No segments provided to translate" });
      }

      const targetLangName =
        targetLanguage === "fr"
          ? "French"
          : targetLanguage === "en"
          ? "English"
          : targetLanguage === "es"
          ? "Spanish"
          : targetLanguage === "de"
          ? "German"
          : targetLanguage;

      const prompt = `Translate each of the following transcript segments accurately and naturally into ${targetLangName}.
Preserve nuance, context, and proper terminology.

Segments:
${JSON.stringify(
  segments.map((s: any, idx: number) => ({
    id: idx,
    speaker: s.speaker,
    text: s.text,
  }))
)}

Return a JSON array of objects: [{ "id": number, "translation": string }]`;

      const response = await generateContentWithRetry({
        models: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                translation: { type: Type.STRING },
              },
              required: ["id", "translation"],
            },
          },
        },
      });

      const translations: Array<{ id: number; translation: string }> = JSON.parse(
        response.text || "[]"
      );

      const updatedSegments = segments.map((seg: any, idx: number) => {
        const match = translations.find((t) => t.id === idx);
        return {
          ...seg,
          translation: match ? match.translation : seg.translation || "",
        };
      });

      res.json({ success: true, segments: updatedSegments });
    } catch (err: any) {
      console.error("Translate transcript error:", err);
      res.status(500).json({
        error: err.message || "Failed to translate transcript",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Scrib server running on http://${HOST}:${PORT}`);
  });
}

startServer();
