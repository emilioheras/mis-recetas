import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { extractRecipeFromText } from "@/lib/ai/llm";
import type { RecipeDraft } from "@/lib/recipes/types";

export async function importFromUrl(url: string): Promise<RecipeDraft> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("La URL no es válida.");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Solo se admiten URLs http:// o https://");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MisRecetas/1.0; +https://github.com/)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`No se pudo descargar la página (HTTP ${res.status}).`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const text = article?.textContent?.trim();
  if (!text || text.length < 80) {
    throw new Error(
      "No se pudo extraer texto legible de la página. Prueba con otra URL o cópiala a mano.",
    );
  }

  const titleHint = article?.title ? `Título sugerido: ${article.title}\n\n` : "";
  return extractRecipeFromText(titleHint + text, { sourceUrl: url });
}
