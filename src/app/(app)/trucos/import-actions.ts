"use server";

import {
  importTrickFromYouTube,
  importTrickFromYouTubeText,
} from "@/lib/importers/youtube";
import type { TrickDraft } from "@/lib/tricks/types";

export type TrickImportResult =
  | { ok: true; draft: TrickDraft }
  | { ok: false; error: string };

export async function importTrickFromYouTubeAction(
  url: string,
): Promise<TrickImportResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "Pega un enlace de YouTube." };
  }

  try {
    const draft = await importTrickFromYouTube(trimmed);
    return { ok: true, draft };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar.",
    };
  }
}

export async function importTrickFromYouTubeTextAction(
  url: string,
  transcript: string,
): Promise<TrickImportResult> {
  const trimmedUrl = url.trim();
  const trimmedText = transcript.trim();
  if (!trimmedUrl) {
    return { ok: false, error: "Pega también el enlace del vídeo." };
  }
  if (!trimmedText) {
    return { ok: false, error: "Pega la transcripción del vídeo." };
  }

  try {
    const draft = await importTrickFromYouTubeText(trimmedUrl, trimmedText);
    return { ok: true, draft };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido al importar.",
    };
  }
}
