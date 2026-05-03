import { Innertube } from "youtubei.js";
import { YoutubeTranscript } from "youtube-transcript";
import { extractRecipeFromText, extractTrickFromText } from "@/lib/ai/llm";
import type { RecipeDraft } from "@/lib/recipes/types";
import type { TrickDraft } from "@/lib/tricks/types";

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

function canonicalVideoUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

type SegmentLike = {
  snippet?: { text?: string };
  text?: string;
};

// Estrategia 1: youtubei.js (Innertube), más robusto contra bloqueos.
async function fetchTranscriptViaInnertube(videoId: string): Promise<string> {
  const youtube = await Innertube.create({
    lang: "es",
    location: "ES",
    retrieve_player: false,
  });
  const info = await youtube.getInfo(videoId);
  const transcriptData = await info.getTranscript();
  // El shape varia entre versiones — probamos varias rutas.
  const candidate = transcriptData as unknown as {
    transcript?: {
      content?: { body?: { initial_segments?: SegmentLike[] } };
      body?: { initial_segments?: SegmentLike[] };
    };
    segments?: SegmentLike[];
  };
  const segments: SegmentLike[] =
    candidate?.transcript?.content?.body?.initial_segments
    ?? candidate?.transcript?.body?.initial_segments
    ?? candidate?.segments
    ?? [];

  return segments
    .map((s) => s.snippet?.text ?? s.text ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Estrategia 2: youtube-transcript (scraping), funciona en local desde IP
// residencial pero suele estar bloqueado en serverless.
async function fetchTranscriptViaScraping(videoId: string): Promise<string> {
  let parts: { text: string }[];
  try {
    parts = await YoutubeTranscript.fetchTranscript(videoId, { lang: "es" });
  } catch {
    parts = await YoutubeTranscript.fetchTranscript(videoId);
  }
  return parts
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTranscriptText(videoId: string): Promise<string> {
  const errors: string[] = [];

  try {
    const text = await fetchTranscriptViaInnertube(videoId);
    if (text.length >= 100) return text;
    errors.push(`innertube: texto vacio o demasiado corto (${text.length} chars)`);
  } catch (err) {
    errors.push(`innertube: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const text = await fetchTranscriptViaScraping(videoId);
    if (text.length >= 100) return text;
    errors.push(`scraping: texto vacio o demasiado corto (${text.length} chars)`);
  } catch (err) {
    errors.push(`scraping: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Visible en logs del servidor (Vercel Logs / terminal de npm run dev).
  console.error("[youtube-import] todos los metodos fallaron:", errors.join(" | "));
  throw new Error("No-transcript");
}

export async function importFromYouTube(url: string): Promise<RecipeDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error(
      "La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).",
    );
  }

  try {
    const text = await fetchTranscriptText(id);
    const videoUrl = canonicalVideoUrl(id);
    return await extractRecipeFromText(text, { videoUrl });
  } catch {
    throw new Error(
      "No hemos podido leer los subtítulos automáticamente. Si el vídeo los tiene, copia la transcripción a mano y pégala abajo.",
    );
  }
}

export async function importFromYouTubeText(
  url: string,
  transcriptText: string,
): Promise<RecipeDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error(
      "La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).",
    );
  }
  const cleaned = transcriptText.replace(/\s+/g, " ").trim();
  if (cleaned.length < 100) {
    throw new Error(
      "La transcripción es demasiado corta para extraer una receta.",
    );
  }
  const videoUrl = canonicalVideoUrl(id);
  return extractRecipeFromText(cleaned, { videoUrl });
}

export async function importTrickFromYouTube(url: string): Promise<TrickDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error(
      "La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).",
    );
  }

  try {
    const text = await fetchTranscriptText(id);
    const videoUrl = canonicalVideoUrl(id);
    return await extractTrickFromText(text, { videoUrl });
  } catch {
    throw new Error(
      "No hemos podido leer los subtítulos automáticamente. Si el vídeo los tiene, copia la transcripción a mano y pégala abajo.",
    );
  }
}

export async function importTrickFromYouTubeText(
  url: string,
  transcriptText: string,
): Promise<TrickDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error(
      "La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).",
    );
  }
  const cleaned = transcriptText.replace(/\s+/g, " ").trim();
  if (cleaned.length < 100) {
    throw new Error(
      "La transcripción es demasiado corta para extraer un truco.",
    );
  }
  const videoUrl = canonicalVideoUrl(id);
  return extractTrickFromText(cleaned, { videoUrl });
}
