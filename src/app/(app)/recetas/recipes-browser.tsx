"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { RecipeListItem } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

type Props = {
  recipes: RecipeListItem[];
};

export function RecipesBrowser({ recipes }: Props) {
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Contadores de alimentos principales: tienen en cuenta el filtro de categoría
  // activo, así un "Pollo (3)" significa "3 recetas de pollo dentro de la categoría
  // que tengo seleccionada", no en absoluto.
  const ingredientCounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of recipes) {
      if (
        activeCategoryId &&
        !r.categories.some((c) => c.id === activeCategoryId)
      ) {
        continue;
      }
      if (!r.main_ingredient) continue;
      const key = r.main_ingredient.id;
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { id: key, name: r.main_ingredient.name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [recipes, activeCategoryId]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of recipes) {
      if (
        activeIngredientId &&
        r.main_ingredient?.id !== activeIngredientId
      ) {
        continue;
      }
      for (const c of r.categories) {
        const entry = map.get(c.id);
        if (entry) entry.count += 1;
        else map.set(c.id, { id: c.id, name: c.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [recipes, activeIngredientId]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (activeIngredientId && r.main_ingredient?.id !== activeIngredientId) {
        return false;
      }
      if (
        activeCategoryId &&
        !r.categories.some((c) => c.id === activeCategoryId)
      ) {
        return false;
      }
      return true;
    });
  }, [recipes, activeIngredientId, activeCategoryId]);

  const hasCategories = categoryCounts.length > 0;
  const hasFilter = activeIngredientId !== null || activeCategoryId !== null;

  const grouped = useMemo(() => {
    const map = new Map<string, RecipeListItem[]>();
    for (const r of filtered) {
      const letter = getInitial(r.title);
      const arr = map.get(letter);
      if (arr) arr.push(r);
      else map.set(letter, [r]);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "es"),
    );
  }, [filtered]);

  function clearFilters() {
    setActiveIngredientId(null);
    setActiveCategoryId(null);
  }

  return (
    <div>
      {ingredientCounts.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {ingredientCounts.map((ing) => {
            const active = ing.id === activeIngredientId;
            return (
              <button
                key={ing.id}
                type="button"
                onClick={() =>
                  setActiveIngredientId(active ? null : ing.id)
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                <span className="capitalize">{ing.name}</span>
                <span
                  className={cn(
                    "tabular-nums text-xs",
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {ing.count}
                </span>
              </button>
            );
          })}
          {hasFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 inline-flex items-center gap-1 rounded-[10px] border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {hasCategories ? (
        <div className="mb-6 md:hidden">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="category-mobile"
              className="block text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              Categorías
            </label>
            <Link
              href="/categorias"
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Gestionar →
            </Link>
          </div>
          <select
            id="category-mobile"
            value={activeCategoryId ?? ""}
            onChange={(e) => setActiveCategoryId(e.target.value || null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Todas —</option>
            {categoryCounts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-10",
          hasCategories ? "md:grid-cols-[1fr_240px]" : "",
        )}
      >
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">
              Sin recetas para los filtros activos.{" "}
              <button
                type="button"
                onClick={clearFilters}
                className="text-primary underline-offset-4 hover:underline"
              >
                Limpiar filtros
              </button>
              .
            </p>
          ) : (
            <div className="space-y-10">
              {grouped.map(([letter, recipesInGroup]) => (
                <section key={letter}>
                  <div className="mb-3 rounded-[10px] bg-band px-4 py-1.5">
                    <span className="text-lg font-semibold tracking-wide text-foreground">
                      {letter}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {recipesInGroup.map((recipe) => (
                      <li key={recipe.id}>
                        <Link
                          href={`/recetas/${recipe.id}`}
                          className="group flex items-baseline justify-between gap-4 py-2.5 transition-colors"
                        >
                          <span className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1.5">
                            <span className="text-lg font-medium leading-snug transition-colors group-hover:text-primary">
                              {recipe.title}
                            </span>
                            {recipe.categories.map((cat) => (
                              <span
                                key={cat.id}
                                className="inline-flex items-center rounded-[10px] bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-secondary-foreground/70"
                              >
                                {cat.name}
                              </span>
                            ))}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {recipe.servings} pers
                            {recipe.prep_minutes
                              ? ` · ${recipe.prep_minutes} min`
                              : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {hasCategories ? (
          <aside className="hidden border-l border-border/60 pl-8 md:block">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground font-sans">
              Categorías
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveCategoryId(null)}
                  className={cn(
                    "w-full text-left transition-colors",
                    activeCategoryId === null
                      ? "font-semibold text-primary"
                      : "text-foreground/85 hover:text-primary",
                  )}
                >
                  — Todas
                </button>
              </li>
              {categoryCounts.map((c) => {
                const active = c.id === activeCategoryId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCategoryId(active ? null : c.id)
                      }
                      className={cn(
                        "w-full text-left transition-colors",
                        active
                          ? "font-semibold text-primary"
                          : "text-foreground/85 hover:text-primary",
                      )}
                    >
                      {c.name}{" "}
                      <span className="tabular-nums text-xs text-muted-foreground/70">
                        ({c.count})
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/categorias"
              className="mt-5 inline-block text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Gestionar →
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function getInitial(title: string): string {
  const t = title.trim();
  if (!t) return "#";
  const first = t[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  return /[A-ZÑ]/.test(first) ? first : "#";
}
