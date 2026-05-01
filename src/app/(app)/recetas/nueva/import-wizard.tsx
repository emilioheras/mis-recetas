"use client";

import { useState, useTransition } from "react";
import { Globe, Pencil, FileText, Youtube, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Category, RecipeDraft } from "@/lib/recipes/types";
import { RecipeForm } from "../recipe-form";
import {
  importFromUrlAction,
  importFromMarkdownAction,
  importFromYouTubeAction,
  importFromYouTubeTextAction,
  uploadPdfAction,
} from "../import-actions";

type TabId = "manual" | "url" | "markdown" | "youtube" | "pdf";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  comingIn?: string;
}> = [
  { id: "manual", label: "Manual", icon: Pencil, enabled: true },
  { id: "url", label: "Desde URL", icon: Globe, enabled: true },
  { id: "markdown", label: "Desde .md", icon: FileText, enabled: true },
  { id: "youtube", label: "Desde YouTube", icon: Youtube, enabled: true },
  { id: "pdf", label: "Desde PDF", icon: FilePlus, enabled: true },
];

export function ImportWizard({
  existingCategories,
}: {
  existingCategories: Category[];
}) {
  const [tab, setTab] = useState<TabId>("manual");
  const [url, setUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytTranscript, setYtTranscript] = useState("");
  const [showManualTranscript, setShowManualTranscript] = useState(false);
  const [mdContent, setMdContent] = useState("");
  const [mdFilename, setMdFilename] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState<{ path: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeTab(newTab: TabId) {
    setTab(newTab);
    setError(null);
    setDraft(null);
    setMdContent("");
    setMdFilename("");
    setYtUrl("");
    setYtTranscript("");
    setShowManualTranscript(false);
    setPdfFile(null);
    setPdfUploaded(null);
  }

  function handleExtract() {
    setError(null);
    startTransition(async () => {
      const result = await importFromUrlAction(url);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleMdFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      setMdContent(text);
      setMdFilename(file.name);
    } catch {
      setError("No se pudo leer el archivo.");
    }
  }

  function handleExtractMd() {
    setError(null);
    startTransition(async () => {
      const result = await importFromMarkdownAction(mdContent, mdFilename);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
      }
    });
  }

  function handleExtractYouTube() {
    setError(null);
    startTransition(async () => {
      const result = await importFromYouTubeAction(ytUrl);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
        // Si falla la extracción automática, abrimos el desplegable de
        // transcripción manual para que el usuario lo vea sin scrollear.
        setShowManualTranscript(true);
      }
    });
  }

  function handleExtractYouTubeText() {
    setError(null);
    startTransition(async () => {
      const result = await importFromYouTubeTextAction(ytUrl, ytTranscript);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setError(result.error);
      }
    });
  }

  function handlePdfFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setPdfFile(file ?? null);
  }

  function handleUploadPdf() {
    if (!pdfFile) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", pdfFile);
    startTransition(async () => {
      const result = await uploadPdfAction(formData);
      if (result.ok) {
        setPdfUploaded({ path: result.path, filename: result.filename });
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
              onClick={() => t.enabled && changeTab(t.id)}
              disabled={!t.enabled}
              title={!t.enabled ? `Disponible en ${t.comingIn}` : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
                !t.enabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "manual" ? (
        <RecipeForm
          recipeId={null}
          initial={{
            title: "",
            servings: 2,
            prep_minutes: null,
            instructions_md: "",
            notes: "",
            ingredients: [],
            categories: [],
          }}
          existingCategories={existingCategories}
        />
      ) : null}

      {tab === "url" && !draft ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="url">URL de la receta</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.recetasgratis.net/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Pegamos la URL, descargamos la página, extraemos el texto y la
                IA lo estructura en una receta editable.
              </p>
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              onClick={handleExtract}
              disabled={isPending || url.trim().length === 0}
            >
              {isPending ? "Extrayendo… (10-20 s)" : "Extraer receta"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "markdown" && !draft ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="md-file">Archivo .md o .markdown</Label>
              <Input
                id="md-file"
                type="file"
                accept=".md,.markdown,text/markdown,text/plain"
                onChange={handleMdFile}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Sube un archivo Markdown (típicamente generado por la
                extensión MarkDownLoad guardando una página web). La IA
                extrae la receta del contenido.
              </p>
              {mdFilename ? (
                <p className="text-xs text-muted-foreground">
                  Cargado: <strong>{mdFilename}</strong> ({Math.round(mdContent.length / 1024)} KB)
                </p>
              ) : null}
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              onClick={handleExtractMd}
              disabled={isPending || mdContent.trim().length === 0}
            >
              {isPending ? "Extrayendo… (5-10 s)" : "Extraer receta"}
            </Button>
          </CardContent>
        </Card>
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
                Descargamos los subtítulos del vídeo y la IA los estructura.
                El vídeo se mostrará embebido arriba en la receta.
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
              {isPending ? "Extrayendo… (10-20 s)" : "Extraer receta"}
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
                    <p className="mb-1 font-medium">Cómo conseguir la transcripción</p>
                    <ol className="ml-4 list-decimal space-y-0.5">
                      <li>
                        Abre el vídeo en YouTube. Bajo el título, pulsa los
                        tres puntos <strong>...</strong> (o &quot;Más&quot;).
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
                      placeholder="0:00 hola a todos hoy vamos a preparar..."
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

      {draft && tab !== "manual" ? (
        <>
          <p className="rounded-md bg-accent p-3 text-sm">
            {tab === "youtube" && draft.video_url ? (
              <>
                Receta extraída del vídeo{" "}
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
            ) : draft.source_url ? (
              <>
                Receta extraída desde{" "}
                <a
                  href={draft.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {draft.source_url}
                </a>
                .
              </>
            ) : (
              <>Receta extraída del archivo {mdFilename || "Markdown"}.</>
            )}{" "}
            Revisa los campos y guarda cuando estés conforme.
          </p>
          <RecipeForm
            recipeId={null}
            initial={{
              title: draft.title,
              servings: draft.servings,
              prep_minutes: draft.prep_minutes,
              instructions_md: draft.instructions_md,
              notes: draft.notes,
              ingredients: draft.ingredients,
              categories: draft.categories ?? [],
            }}
            existingCategories={existingCategories}
            source={{
              type:
                tab === "url" ? "url"
                : tab === "markdown" ? "markdown"
                : tab === "youtube" ? "youtube"
                : "manual",
              url: draft.source_url,
              videoUrl: draft.video_url,
            }}
          />
        </>
      ) : null}

      {tab === "pdf" && !pdfUploaded ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="pdf-file">Archivo PDF</Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfFile}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Sube tu PDF (máximo 10 MB). Lo guardaremos en la nube y lo
                podrás ver embebido al abrir la receta. Después rellenas título,
                ingredientes y pasos a mano consultando el PDF.
              </p>
              {pdfFile ? (
                <p className="text-xs text-muted-foreground">
                  Seleccionado: <strong>{pdfFile.name}</strong> (
                  {Math.round(pdfFile.size / 1024)} KB)
                </p>
              ) : null}
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button onClick={handleUploadPdf} disabled={isPending || !pdfFile}>
              {isPending ? "Subiendo…" : "Subir y continuar"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "pdf" && pdfUploaded ? (
        <>
          <p className="rounded-md bg-accent p-3 text-sm">
            PDF subido: <strong>{pdfUploaded.filename}</strong>. Ahora rellena
            los datos de la receta consultando el archivo. Cuando guardes,
            podrás verlo embebido en la pantalla de detalle.
          </p>
          <RecipeForm
            recipeId={null}
            initial={{
              title: pdfUploaded.filename.replace(/\.pdf$/i, ""),
              servings: 2,
              prep_minutes: null,
              instructions_md: "",
              notes: "",
              ingredients: [],
              categories: [],
            }}
            existingCategories={existingCategories}
            source={{ type: "pdf", pdfUrl: pdfUploaded.path }}
          />
        </>
      ) : null}
    </div>
  );
}
