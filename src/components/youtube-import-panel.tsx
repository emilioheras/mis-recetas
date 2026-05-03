"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExtractResult<T> =
  | { ok: true; draft: T }
  | { ok: false; error: string };

type Props<T> = {
  noun: "receta" | "truco";
  extractAuto: (url: string) => Promise<ExtractResult<T>>;
  extractManual: (url: string, transcript: string) => Promise<ExtractResult<T>>;
  onSuccess: (draft: T) => void;
};

export function YouTubeImportPanel<T>({
  noun,
  extractAuto,
  extractManual,
  onSuccess,
}: Props<T>) {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExtractAuto() {
    setError(null);
    startTransition(async () => {
      const result = await extractAuto(url);
      if (result.ok) {
        onSuccess(result.draft);
      } else {
        setError(result.error);
        // Si falla la extracción automática, abrimos el desplegable manual
        // para que el usuario lo vea sin scrollear.
        setShowManual(true);
      }
    });
  }

  function handleExtractManual() {
    setError(null);
    startTransition(async () => {
      const result = await extractManual(url, transcript);
      if (result.ok) {
        onSuccess(result.draft);
      } else {
        setError(result.error);
      }
    });
  }

  const description =
    noun === "receta"
      ? "Descargamos los subtítulos del vídeo y la IA los estructura. El vídeo se mostrará embebido arriba en la receta."
      : "Descargamos los subtítulos del vídeo y la IA extrae el truco. El vídeo se guarda como enlace y se mostrará embebido en el truco.";
  const placeholder =
    noun === "receta"
      ? "0:00 hola a todos hoy vamos a preparar..."
      : "0:00 hola a todos hoy os enseño el truco para...";

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-2">
          <Label htmlFor="yt-url">Enlace del vídeo</Label>
          <Input
            id="yt-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          onClick={handleExtractAuto}
          disabled={isPending || url.trim().length === 0}
        >
          {isPending ? "Extrayendo… (10-20 s)" : `Extraer ${noun}`}
        </Button>

        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {showManual
              ? "Ocultar opción manual"
              : "¿No funciona? Pega la transcripción a mano"}
          </button>

          {showManual ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-md bg-accent p-3 text-xs leading-relaxed">
                <p className="mb-1 font-medium">
                  Cómo conseguir la transcripción
                </p>
                <ol className="ml-4 list-decimal space-y-0.5">
                  <li>
                    Abre el vídeo en YouTube. Bajo el título, pulsa los tres
                    puntos <strong>...</strong> (o &quot;Más&quot;).
                  </li>
                  <li>
                    Pulsa <strong>&quot;Mostrar transcripción&quot;</strong>.
                  </li>
                  <li>
                    En el panel que se abre a la derecha, haz clic dentro,
                    Ctrl+A para seleccionar todo y Ctrl+C para copiar.
                  </li>
                  <li>Pégala aquí abajo.</li>
                </ol>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="yt-transcript">Transcripción del vídeo</Label>
                <Textarea
                  id="yt-transcript"
                  rows={8}
                  placeholder={placeholder}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  No te preocupes por las marcas de tiempo (0:00, 1:23…), la
                  IA las ignora.
                </p>
              </div>
              <Button
                onClick={handleExtractManual}
                disabled={
                  isPending
                  || url.trim().length === 0
                  || transcript.trim().length < 100
                }
              >
                {isPending ? "Extrayendo…" : "Extraer desde transcripción"}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
