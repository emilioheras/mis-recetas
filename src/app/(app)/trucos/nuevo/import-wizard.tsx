"use client";

import { useState, useTransition } from "react";
import { Pencil, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TrickCategory, TrickDraft } from "@/lib/tricks/types";
import { TrickForm } from "../trick-form";
import {
  importTrickFromYouTubeAction,
  importTrickFromYouTubeTextAction,
} from "../import-actions";

type TabId = "manual" | "youtube";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "manual", label: "Manual", icon: Pencil },
  { id: "youtube", label: "Desde YouTube", icon: Youtube },
];

export function TrickImportWizard({
  existingCategories,
}: {
  existingCategories: TrickCategory[];
}) {
  const [tab, setTab] = useState<TabId>("manual");
  const [ytUrl, setYtUrl] = useState("");
  const [ytTranscript, setYtTranscript] = useState("");
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrickDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeTab(newTab: TabId) {
    setTab(newTab);
    setError(null);
    setDraft(null);
    setYtUrl("");
    setYtTranscript("");
    setShowManualTranscript(false);
  }

  function handleExtractYouTube() {
    setError(null);
    startTransition(async () => {
      const result = await importTrickFromYouTubeAction(ytUrl);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
        setShowManualTranscript(true);
      }
    });
  }

  function handleExtractYouTubeText() {
    setError(null);
    startTransition(async () => {
      const result = await importTrickFromYouTubeTextAction(ytUrl, ytTranscript);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "manual" ? (
        <TrickForm
          trickId={null}
          initial={{
            title: "",
            notes: "",
            image_url: null,
            video_url: null,
            source_url: null,
            categories: [],
          }}
          existingCategories={existingCategories}
        />
      ) : null}

      {tab === "youtube" && !draft ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="yt-url">Enlace del vídeo</Label>
              <Input
                id="yt-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Descargamos los subtítulos del vídeo y la IA extrae el truco.
                El vídeo se guarda como enlace y se mostrará embebido en el
                truco.
              </p>
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              onClick={handleExtractYouTube}
              disabled={isPending || ytUrl.trim().length === 0}
            >
              {isPending ? "Extrayendo… (10-20 s)" : "Extraer truco"}
            </Button>

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowManualTranscript((v) => !v)}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {showManualTranscript
                  ? "Ocultar opción manual"
                  : "¿No funciona? Pega la transcripción a mano"}
              </button>

              {showManualTranscript ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md bg-accent p-3 text-xs leading-relaxed">
                    <p className="mb-1 font-medium">
                      Cómo conseguir la transcripción
                    </p>
                    <ol className="ml-4 list-decimal space-y-0.5">
                      <li>
                        Abre el vídeo en YouTube. Bajo el título, pulsa los
                        tres puntos <strong>...</strong> (o &quot;Más&quot;).
                      </li>
                      <li>
                        Pulsa{" "}
                        <strong>&quot;Mostrar transcripción&quot;</strong>.
                      </li>
                      <li>
                        En el panel que se abre a la derecha, haz clic dentro,
                        Ctrl+A para seleccionar todo y Ctrl+C para copiar.
                      </li>
                      <li>Pégala aquí abajo.</li>
                    </ol>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="yt-transcript">
                      Transcripción del vídeo
                    </Label>
                    <Textarea
                      id="yt-transcript"
                      rows={8}
                      placeholder="0:00 hola a todos hoy os enseño el truco para..."
                      value={ytTranscript}
                      onChange={(e) => setYtTranscript(e.target.value)}
                      disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      No te preocupes por las marcas de tiempo (0:00, 1:23…),
                      la IA las ignora.
                    </p>
                  </div>
                  <Button
                    onClick={handleExtractYouTubeText}
                    disabled={
                      isPending
                      || ytUrl.trim().length === 0
                      || ytTranscript.trim().length < 100
                    }
                  >
                    {isPending ? "Extrayendo…" : "Extraer desde transcripción"}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "youtube" && draft ? (
        <>
          <p className="rounded-md bg-accent p-3 text-sm">
            {draft.video_url ? (
              <>
                Truco extraído del vídeo{" "}
                <a
                  href={draft.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {draft.video_url}
                </a>
                .
              </>
            ) : (
              <>Truco extraído.</>
            )}{" "}
            Revisa los campos y guarda cuando estés conforme.
          </p>
          <TrickForm
            trickId={null}
            initial={{
              title: draft.title,
              notes: draft.notes,
              image_url: null,
              video_url: draft.video_url,
              source_url: draft.source_url,
              categories: [],
            }}
            existingCategories={existingCategories}
          />
        </>
      ) : null}
    </div>
  );
}
