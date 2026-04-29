"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import type { IngredientFormRow, RecipeSource } from "@/lib/recipes/types";
import { saveRecipeAction } from "./actions";

type Props = {
  recipeId: string | null;
  initial: {
    title: string;
    servings: number;
    prep_minutes: number | null;
    instructions_md: string;
    notes: string;
    main_ingredient_name: string;
    main_ingredient_category: IngredientCategory;
    ingredients: IngredientFormRow[];
  };
  source?: RecipeSource;
};

const EMPTY_ROW: IngredientFormRow = {
  name: "",
  quantity: "",
  unit: "g",
  notes: "",
};

export function RecipeForm({ recipeId, initial, source }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [servings, setServings] = useState(String(initial.servings));
  const [prepMinutes, setPrepMinutes] = useState(
    initial.prep_minutes === null ? "" : String(initial.prep_minutes),
  );
  const [mainName, setMainName] = useState(initial.main_ingredient_name);
  const [mainCategory, setMainCategory] = useState<IngredientCategory>(
    initial.main_ingredient_category,
  );
  const [instructions, setInstructions] = useState(initial.instructions_md);
  const [notes, setNotes] = useState(initial.notes);
  const [ingredients, setIngredients] = useState<IngredientFormRow[]>(
    initial.ingredients.length > 0 ? initial.ingredients : [EMPTY_ROW],
  );

  function updateRow(index: number, patch: Partial<IngredientFormRow>) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function addRow() {
    setIngredients((prev) => [...prev, EMPTY_ROW]);
  }
  function removeRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
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
          {source.url ? (
            <input type="hidden" name="source_url" value={source.url} />
          ) : null}
          {source.videoUrl ? (
            <input type="hidden" name="video_url" value={source.videoUrl} />
          ) : null}
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
        <legend className="px-1 text-sm font-medium">Ingrediente principal</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="main_ingredient_name">Nombre</Label>
            <Input
              id="main_ingredient_name"
              name="main_ingredient_name"
              required
              value={mainName}
              onChange={(e) => setMainName(e.target.value)}
              placeholder="Pollo, tomate, garbanzos…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="main_ingredient_category">Categoría</Label>
            <Select
              id="main_ingredient_category"
              name="main_ingredient_category"
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value as IngredientCategory)}
            >
              {INGREDIENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Usado para agrupar tus recetas y para la &quot;receta del día&quot; por temporada.
        </p>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Otros ingredientes</legend>
        {ingredients.map((row, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-5">
              <Label htmlFor={`ing-name-${index}`} className="sr-only">
                Nombre
              </Label>
              <Input
                id={`ing-name-${index}`}
                placeholder="Aceite de oliva"
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
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
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Input
                placeholder="notas"
                value={row.notes}
                onChange={(e) => updateRow(index, { notes: e.target.value })}
              />
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : recipeId ? "Guardar cambios" : "Crear receta"}
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
