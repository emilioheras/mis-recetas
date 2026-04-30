import { Innertube } from "youtubei.js";
import { extractRecipeFromText } from "@/lib/ai/llm";
import type { RecipeDraft } from "@/lib/recipes/types";

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

async function fetchTranscriptText(videoId: string): Promise<string> {
  const youtube = await Innertube.create({
    lang: "es",
    location: "ES",
    retrieve_player: false,
  });
  const info = await youtube.getInfo(videoId);
  const transcriptData = await info.getTranscript();
  // El shape de la respuesta cambia entre versiones; cubrimos las dos formas
  // habituales sin tipado estricto del SDK (su tipo interno es muy denso).
  const root = transcriptData as unknown as {
    transcript?: { content?: { body?: { initial_segments?: SegmentLike[] } } };
  };
  const segments: SegmentLike[] =
    root?.transcript?.content?.body?.initial_segments ?? [];

  return segments
    .map((s) => s.snippet?.text ?? s.text ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function importFromYouTube(url: string): Promise<RecipeDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error(
      "La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).",
    );
  }

  let text: string;
  try {
    text = await fetchTranscriptText(id);
  } catch {
    throw new Error(
      "No hemos podido leer los subtítulos automáticamente. Si el vídeo los tiene, copia la transcripción a mano y pégala abajo.",
    );
  }

  if (text.length < 100) {
    throw new Error(
      "No hemos podido leer subtítulos de este vídeo. Copia la transcripción a mano y pégala abajo.",
    );
  }

  const videoUrl = canonicalVideoUrl(id);
  return extractRecipeFromText(text, { videoUrl });
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
