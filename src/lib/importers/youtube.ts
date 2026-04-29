import { YoutubeTranscript } from "youtube-transcript";
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

export async function importFromYouTube(url: string): Promise<RecipeDraft> {
  const id = extractVideoId(url);
  if (!id) {
    throw new Error("La URL no parece de YouTube. Pega un enlace de un vídeo (youtube.com/watch?v=… o youtu.be/…).");
  }

  let transcriptParts: { text: string }[];
  try {
    transcriptParts = await YoutubeTranscript.fetchTranscript(id, {
      lang: "es",
    });
  } catch {
    try {
      transcriptParts = await YoutubeTranscript.fetchTranscript(id);
    } catch {
      throw new Error(
        "No se pudo obtener la transcripción del vídeo. Puede que no tenga subtítulos. Prueba con otro vídeo o crea la receta a mano.",
      );
    }
  }

  const text = transcriptParts
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 100) {
    throw new Error(
      "La transcripción es demasiado corta para extraer una receta.",
    );
  }

  const videoUrl = canonicalVideoUrl(id);
  return extractRecipeFromText(text, { videoUrl });
}
