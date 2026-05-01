"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTrickAction, uploadTrickImageAction } from "./actions";

type Props = {
  trickId: string | null;
  initial: {
    title: string;
    notes: string;
    image_url: string | null;
    video_url: string | null;
    source_url: string | null;
  };
  initialImageSignedUrl?: string | null;
};

export function TrickForm({ trickId, initial, initialImageSignedUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [sourceUrl, setSourceUrl] = useState(initial.source_url ?? "");
  const [videoUrl, setVideoUrl] = useState(initial.video_url ?? "");
  const [imagePath, setImagePath] = useState<string>(initial.image_url ?? "");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(
    initialImageSignedUrl ?? "",
  );
  const [imageUploading, setImageUploading] = useState(false);

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadTrickImageAction(fd);
      if (result.ok) {
        setImagePath(result.path);
        setImagePreviewUrl(result.signedUrl);
      } else {
        setError(result.error);
      }
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  function removeImage() {
    setImagePath("");
    setImagePreviewUrl("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveTrickAction(trickId, formData);
      if (result.ok) {
        router.push(`/trucos/${result.trickId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Afilar un cuchillo"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Pasa la hoja por una chaira a unos 20 grados, alternando lados…"
        />
        <p className="text-xs text-muted-foreground">Acepta formato Markdown.</p>
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          Imagen, vídeo y fuente (opcional)
        </legend>

        <input type="hidden" name="image_url" value={imagePath} />

        <div className="grid gap-2">
          <Label htmlFor="image_file">Imagen</Label>
          {imagePreviewUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={imagePreviewUrl}
                alt="Vista previa"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={imageUploading}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur transition-colors hover:bg-background"
                aria-label="Quitar imagen"
                title="Quitar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <Input
            id="image_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleImageFile}
            disabled={imageUploading}
          />
          <p className="text-xs text-muted-foreground">
            Aparecerá como banner 16:9 en la pantalla del truco. Máximo 5 MB.{" "}
            {imageUploading ? "Subiendo…" : null}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="video_url">Enlace de YouTube</Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si lo rellenas, el vídeo aparecerá embebido en el truco.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="source_url">URL de la fuente</Label>
          <Input
            id="source_url"
            name="source_url"
            type="url"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Aparece como enlace al final del truco.
          </p>
        </div>
      </fieldset>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || imageUploading}>
          {isPending
            ? "Guardando…"
            : imageUploading
            ? "Subiendo imagen…"
            : trickId
            ? "Guardar cambios"
            : "Crear truco"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
