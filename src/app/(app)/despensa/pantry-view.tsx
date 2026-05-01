"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/shopping";
import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
} from "@/lib/ingredients";
import type { PantryIngredient } from "@/lib/recipes/queries";
import {
  addPantryIngredientAction,
  deleteIngredientAction,
  togglePantryAction,
} from "./actions";

type Props = {
  ingredients: PantryIngredient[];
};

export function PantryView({ ingredients }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado optimista del flag is_pantry por ingrediente.
  const [pantryMap, setPantryMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ingredients.map((i) => [i.id, i.is_pantry])),
  );

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] =
    useState<IngredientCategory>("condimento");

  const grouped = useMemo(() => {
    const map = new Map<IngredientCategory, PantryIngredient[]>();
    for (const ing of ingredients) {
      const arr = map.get(ing.category);
      if (arr) arr.push(ing);
      else map.set(ing.category, [ing]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name, "es"));
    }
    return map;
  }, [ingredients]);

  function handleToggle(ingredientId: string, current: boolean) {
    const next = !current;
    setPantryMap((prev) => ({ ...prev, [ingredientId]: next }));
    startTransition(async () => {
      const res = await togglePantryAction(ingredientId, next);
      if (!res.ok) {
        setPantryMap((prev) => ({ ...prev, [ingredientId]: current }));
        setError(res.error);
      } else {
        setError(null);
      }
    });
  }

  function handleDelete(ingredientId: string, name: string) {
    if (
      !window.confirm(
        `¿Borrar "${name}" de tus ingredientes? No se puede deshacer.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteIngredientAction(ingredientId);
      if (!res.ok) setError(res.error);
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addPantryIngredientAction(newName, newCategory);
      if (res.ok) {
        setNewName("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleAdd}
        className="rounded-[10px] border bg-card p-4 sm:p-5"
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
          Añadir ingrediente
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Para añadir cosas que tienes siempre en casa pero no sueles escribir
          en las recetas (sal, aceite, ajo, perejil…). Se crean ya marcadas
          como despensa.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div className="grid gap-1.5">
            <Label htmlFor="pantry-new-name" className="text-xs">
              Nombre
            </Label>
            <Input
              id="pantry-new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Sal, aceite, ajo…"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pantry-new-category" className="text-xs">
              Categoría
            </Label>
            <Select
              id="pantry-new-category"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as IngredientCategory)
              }
              disabled={isPending}
            >
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isPending || !newName.trim()}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Añadir
            </Button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {ingredients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no tienes ingredientes guardados. Añade uno arriba o crea una
          receta con ingredientes y volverás aquí a marcarlos como despensa.
        </p>
      ) : (
        <div className="space-y-7">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                  {CATEGORY_LABEL[cat]}
                </h2>
                <ul className="rounded-[10px] border bg-card divide-y divide-border/60">
                  {items.map((ing) => {
                    const checked = pantryMap[ing.id] ?? false;
                    return (
                      <li
                        key={ing.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <input
                          type="checkbox"
                          id={`pantry-${ing.id}`}
                          checked={checked}
                          onChange={() => handleToggle(ing.id, checked)}
                          className="h-4 w-4 rounded border-input"
                          disabled={isPending}
                        />
                        <label
                          htmlFor={`pantry-${ing.id}`}
                          className="flex-1 cursor-pointer capitalize"
                        >
                          {ing.name}
                        </label>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {ing.recipe_count === 0
                            ? "sin recetas"
                            : ing.recipe_count === 1
                            ? "1 receta"
                            : `${ing.recipe_count} recetas`}
                        </span>
                        {ing.recipe_count === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(ing.id, ing.name)}
                            disabled={isPending}
                            aria-label={`Borrar ${ing.name}`}
                            title="Borrar ingrediente"
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
