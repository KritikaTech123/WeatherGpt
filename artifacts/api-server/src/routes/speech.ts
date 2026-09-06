import Busboy from "busboy";
import { Router, type IRouter, type Request } from "express";

const router: IRouter = Router();

const supportedLanguages = [
  "English",
  "Assamese",
  "Bengali",
  "Bodo",
  "Dogri",
  "Gujarati",
  "Hindi",
  "Kannada",
  "Kashmiri",
  "Konkani",
  "Maithili",
  "Malayalam",
  "Manipuri",
  "Marathi",
  "Nepali",
  "Odia",
  "Punjabi",
  "Sanskrit",
  "Santali",
  "Sindhi",
  "Tamil",
  "Telugu",
  "Urdu",
] as const;

const languageCodes: Record<string, string> = {
  English: "en",
  Assamese: "as",
  Bengali: "bn",
  Bodo: "brx",
  Dogri: "doi",
  Gujarati: "gu",
  Hindi: "hi",
  Kannada: "kn",
  Kashmiri: "ks",
  Konkani: "kok",
  Maithili: "mai",
  Malayalam: "ml",
  Manipuri: "mni",
  Marathi: "mr",
  Nepali: "ne",
  Odia: "or",
  Punjabi: "pa",
  Sanskrit: "sa",
  Santali: "sat",
  Sindhi: "sd",
  Tamil: "ta",
  Telugu: "te",
  Urdu: "ur",
};

const unavailableMessage =
  "Online speech and translation are not configured yet. You can still type your question and use the offline weather guidance.";

const openAiKey = () => process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openAiBaseUrl = () =>
  (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "").replace(/\/+$/, "");

const hasAiService = () => Boolean(openAiKey() && openAiBaseUrl());

function languageName(value: unknown): string {
  return typeof value === "string" && supportedLanguages.includes(value as (typeof supportedLanguages)[number])
    ? value
    : "English";
}

async function callOpenAi(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(`${openAiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${openAiKey()}`,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readRecording(req: Request): Promise<{
  audio: Buffer;
  mimeType: string;
  language: string;
}> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      reject(new Error("A multipart audio recording is required."));
      return;
    }

    const parser = Busboy({
      headers: req.headers,
      limits: { fileSize: 12_000_000, files: 1 },
    });
    const chunks: Buffer[] = [];
    let mimeType = "audio/m4a";
    let language = "English";
    let foundAudio = false;

    parser.on("field", (name, value) => {
      if (name === "language") language = languageName(value);
    });
    parser.on("file", (name, file, info) => {
      if (name !== "audio") {
        file.resume();
        return;
      }
      foundAudio = true;
      mimeType = info.mimeType || mimeType;
      file.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      file.on("limit", () => reject(new Error("Recording is too large.")));
    });
    parser.on("error", reject);
    parser.on("finish", () => {
      const audio = Buffer.concat(chunks);
      if (!foundAudio || audio.length === 0) {
        reject(new Error("The recording did not contain any audio."));
        return;
      }
      resolve({ audio, mimeType, language });
    });
    req.pipe(parser);
  });
}

router.get("/speech/status", (_req, res) => {
  const configured = hasAiService();
  res.json({
    speechToTextAvailable: configured,
    translationAvailable: configured,
    message: configured
      ? "Online speech and translation are ready."
      : unavailableMessage,
    supportedLanguages,
  });
});

router.post("/speech/transcribe", async (req, res) => {
  if (!hasAiService()) {
    res.status(503).json({
      code: "SERVICE_UNAVAILABLE",
      message: unavailableMessage,
    });
    return;
  }

  try {
    const recording = await readRecording(req);
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(recording.audio) as Uint8Array<ArrayBuffer>], {
        type: recording.mimeType,
      }),
      "farmer-question.m4a",
    );
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", languageCodes[recording.language] ?? "en");

    const response = await callOpenAi("/audio/transcriptions", {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      res.status(502).json({
        code: "SPEECH_PROVIDER_ERROR",
        message: "The speech service could not transcribe that recording. Please try again or type your question.",
      });
      return;
    }
    const data = (await response.json()) as { text?: string; language?: string };
    const transcript = data.text?.trim();
    if (!transcript) {
      res.status(422).json({
        code: "EMPTY_TRANSCRIPT",
        message: "I could not hear any words. Please try again in a quiet place or type your question.",
      });
      return;
    }
    res.json({
      transcript,
      language: recording.language,
      fallback: false,
      message: "Transcript ready. You can edit it before sending.",
    });
  } catch (error) {
    req.log?.warn({ error }, "speech transcription failed");
    res.status(502).json({
      code: "SPEECH_PROVIDER_ERROR",
      message: "The speech service could not transcribe that recording. Please try again or type your question.",
    });
  }
});

router.post("/translation", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const targetLanguage = languageName(req.body?.targetLanguage);
  const sourceLanguage = languageName(req.body?.sourceLanguage);

  if (!text) {
    res.status(400).json({ message: "Text is required for translation." });
    return;
  }
  if (!hasAiService()) {
    res.status(503).json({
      code: "SERVICE_UNAVAILABLE",
      message: unavailableMessage,
    });
    return;
  }
  if (targetLanguage === sourceLanguage || targetLanguage === "English" && sourceLanguage === "English") {
    res.json({
      translation: text,
      targetLanguage,
      fallback: false,
      message: "The selected language matches the original.",
    });
    return;
  }

  try {
    const response = await callOpenAi("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a careful agricultural translator. Translate the user's text into the requested Indian language. Preserve numbers, crop names, place names, tone, and line breaks. Return only the translation, with no explanation.",
          },
          {
            role: "user",
            content: `Target language: ${targetLanguage}\nSource language: ${sourceLanguage}\nText:\n${text}`,
          },
        ],
      }),
    });
    if (!response.ok) {
      res.status(502).json({
        code: "TRANSLATION_PROVIDER_ERROR",
        message: "The translation service is unavailable. The original text is still shown safely.",
      });
      return;
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const translation = data.choices?.[0]?.message?.content?.trim();
    if (!translation) {
      res.status(502).json({
        code: "EMPTY_TRANSLATION",
        message: "The translation service returned no text. The original text is still shown safely.",
      });
      return;
    }
    res.json({
      translation,
      targetLanguage,
      fallback: false,
      message: "Translated with the online language service.",
    });
  } catch (error) {
    req.log?.warn({ error }, "translation failed");
    res.status(502).json({
      code: "TRANSLATION_PROVIDER_ERROR",
      message: "The translation service is unavailable. The original text is still shown safely.",
    });
  }
});

export default router;