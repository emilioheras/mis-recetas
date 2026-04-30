"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INGREDIENT_CATEGORIES,
  UNITS,
  type IngredientCategory,
  type Unit,
} from "@/lib/ingredients";
import { cn } from "@/lib/utils";
import type { IngredientFormRow, RecipeSource } from "@/lib/recipes/types";
import { saveRecipeAction } from "./actions";
import { uploadImageAction } from "./import-actions";

type Props = {
  recipeId: string | null;
  initial: {
    title: string;
    servings: number;
    prep_minutes: number | null;
    instructions_md: string;
    notes: string;
    ingredients: IngredientFormRow[];
  };
  source?: RecipeSource;
  initialImageSignedUrl?: string | null;
};

const EMPTY_ROW: IngredientFormRow = {
  name: "",
  quantity: "",
  unit: "g",
  category: "otro",
  is_main: false,
  notes: "",
};

export function RecipeForm({
  recipeId,
  initial,
  source,
  initialImageSignedUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [servings, setServings] = useState(String(initial.servings));
  const [prepMinutes, setPrepMinutes] = useState(
    initial.prep_minutes === null ? "" : String(initial.prep_minutes),
  );
  const [instructions, setInstructions] = useState(initial.instructions_md);
  const [notes, setNotes] = useState(initial.notes);
  const [sourceUrl, setSourceUrl] = useState(source?.url ?? "");
  const [videoUrl, setVideoUrl] = useState(source?.videoUrl ?? "");
  const [imagePath, setImagePath] = useState<string>(source?.imageUrl ?? "");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(
    initialImageSignedUrl ?? "",
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientFormRow[]>(
    initial.ingredients.length > 0
      ? initial.ingredients
      : [{ ...EMPTY_ROW, is_main: true }],
  );

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadImageAction(fd);
      if (result.ok) {
        setImagePath(result.path);
        setImagePreviewUrl(result.signedUrl);
      } else {
        setError(result.error);
      }
    } finally {
      setImageUploading(false);
      // Permite volver a seleccionar el mismo fichero si lo borramos.
      event.target.value = "";
    }
  }

  function removeImage() {
    setImagePath("");
    setImagePreviewUrl("");
  }

  function updateRow(index: number, patch: Partial<IngredientFormRow>) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function addRow() {
    setIngredients((prev) => [...prev, { ...EMPTY_ROW }]);
  }
  function removeRow(index: number) {
    setIngredients((prev) => {
      const wasMain = prev[index]?.is_main ?? false;
      const next = prev.filter((_, i) => i !== index);
      // Si quitamos el principal, el primero pasa a serlo.
      if (wasMain && next.length > 0 && !next.some((r) => r.is_main)) {
        next[0] = { ...next[0], is_main: true };
      }
      return next;
    });
  }
  function setAsMain(index: number) {
    setIngredients((prev) =>
      prev.map((row, i) => ({ ...row, is_main: i === index })),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("ingredients", JSON.stringify(ingredients));

    startTransition(async () => {
      const result = await saveRecipeAction(recipeId, formData);
      if (result.ok) {
        router.push(`/recetas/${result.recipeId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {source ? (
        <>
          <input type="hidden" name="source_type" value={source.type} />
          {source.pdfUrl ? (
            <input type="hidden" name="pdf_url" value={source.pdfUrl} />
          ) : null}
        </>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pollo al limón"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="servings">Comensales</Label>
          <Input
            id="servings"
            name="servings"
            type="number"
            min={1}
            max={20}
            required
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prep_minutes">Tiempo (min)</Label>
          <Input
            id="prep_minutes"
            name="prep_minutes"
            type="number"
            min={0}
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Ingredientes</legend>
        <p className="text-xs text-muted-foreground">
          Marca con la <Star className="inline h-3 w-3 align-text-bottom" /> el
          ingrediente principal (el que define el plato). Lo usamos para
          agrupar tus recetas y elegir la receta del día por temporada.
        </p>
        {ingredients.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-end border-b border-border/40 pb-3 last:border-b-0"
          >
            <div className="col-span-1 flex justify-start pb-2">
              <button
                type="button"
                onClick={() => setAsMain(index)}
                aria-label={
                  row.is_main ? "Ingrediente principal" : "Marcar como principal"
                }
                title={
                  row.is_main ? "Ingrediente principal" : "Marcar como principal"
                }
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  row.is_main
                    ? "text-amber-500"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Star
                  className="h-4 w-4"
                  fill={row.is_main ? "currentColor" : "none"}
                />
              </button>
            </div>
            <div className="col-span-11 sm:col-span-4">
              <Label htmlFor={`ing-name-${index}`} className="sr-only">
                Nombre
              </Label>
              <Input
                id={`ing-name-${index}`}
                placeholder="Tomate, pollo, aceite…"
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Input
                placeholder="200"
                inputMode="decimal"
                value={row.quantity}
                onChange={(e) => updateRow(index, { quantity: e.target.value })}
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Select
                value={row.unit}
                onChange={(e) => updateRow(index, { unit: e.target.value as Unit })}
                aria-label="Unidad"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Select
                value={row.category}
                onChange={(e) =>
                  updateRow(index, {
                    category: e.target.value as IngredientCategory,
                  })
                }
                aria-label="Categoría"
              >
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={ingredients.length === 1}
                aria-label="Eliminar ingrediente"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="col-span-12">
              <Input
                placeholder="Notas (ej: picado fino, opcional)"
                value={row.notes}
                onChange={(e) => updateRow(index, { notes: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" /> Añadir ingrediente
        </Button>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="instructions_md">Pasos</Label>
        <Textarea
          id="instructions_md"
          name="instructions_md"
          rows={10}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="1. Pica la cebolla.&#10;2. Sofríe en aceite…"
        />
        <p className="text-xs text-muted-foreground">
          Acepta formato Markdown.
        </p>
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Imagen, vídeo y fuente (opcional)</legend>

        <input type="hidden" name="image_url" value={imagePath} />

        <div className="grid gap-2">
          <Label htmlFor="image_file">Imagen de portada</Label>
          {imagePreviewUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={imagePreviewUrl}
                alt="Vista previa de la imagen de portada"
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
            Aparecerá como banner 16:9 arriba en la receta. Máximo 5 MB.{" "}
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
            Si lo rellenas, el vídeo aparecerá embebido en la receta.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="source_url">URL de la fuente</Label>
          <Input
            id="source_url"
            name="source_url"
            type="url"
            placeholder="https://www.recetasgratis.net/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Aparece como enlace al final de la receta.
          </p>
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="A mi madre le encanta esta versión con un poco de azafrán."
        />
      </div>

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
            : recipeId
            ? "Guardar cambios"
            : "Crear receta"}
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
