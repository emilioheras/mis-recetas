"use server";

import { importFromUrl } from "@/lib/importers/url";
import { importFromYouTube } from "@/lib/importers/youtube";
import { extractRecipeFromText } from "@/lib/ai/llm";
import { uploadRecipePdf } from "@/lib/recipes/pdf-storage";
import type { RecipeDraft } from "@/lib/recipes/types";

export type ImportResult =
  | { ok: true; draft: RecipeDraft }
  | { ok: false; error: string };

export type PdfUploadResult =
  | { ok: true; path: string; filename: string }
  | { ok: false; error: string };

export async function importFromUrlAction(url: string): Promise<ImportResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "Pega una URL." };
  }

  try {
    const draft = await importFromUrl(trimmed);
    return { ok: true, draft };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar.",
    };
  }
}

export async function importFromYouTubeAction(url: string): Promise<ImportResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "Pega un enlace de YouTube." };
  }

  try {
    const draft = await importFromYouTube(trimmed);
    return { ok: true, draft };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar.",
    };
  }
}

export async function uploadPdfAction(formData: FormData): Promise<PdfUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Selecciona un archivo PDF." };
  }

  try {
    const { path } = await uploadRecipePdf(file);
    return { ok: true, path, filename: file.name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo subir el PDF.",
    };
  }
}

export async function importFromMarkdownAction(
  content: string,
  filename?: string,
): Promise<ImportResult> {
  if (!content || content.trim().length < 20) {
    return { ok: false, error: "El archivo está vacío o es demasiado corto." };
  }

  // MarkDownLoad y similares meten la URL original en una línea como:
  //   [Source](https://...)  o  Origin: https://...
  // Si la encontramos, la pasamos como contexto.
  let sourceUrl: string | undefined;
  const urlMatch = content.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) sourceUrl = urlMatch[0];

  try {
    const draft = await extractRecipeFromText(content, { sourceUrl });
    return {
      ok: true,
      draft: {
        ...draft,
        source_type: "markdown",
        notes: draft.notes
          || (filename ? `Importado desde ${filename}` : ""),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar.",
    };
  }
}
