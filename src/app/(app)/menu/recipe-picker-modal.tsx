"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RecipeListItem } from "@/lib/recipes/types";

type Props = {
  open: boolean;
  title: string;
  recipes: RecipeListItem[];
  onClose: () => void;
  onSelect: (recipeId: string) => void;
};

export function RecipePickerModal({
  open,
  title,
  recipes,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIngredientId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const ingredientCounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of recipes) {
      if (!r.main_ingredient) continue;
      const key = r.main_ingredient.id;
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { id: key, name: r.main_ingredient.name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => {
        if (
          activeIngredientId &&
          r.main_ingredient?.id !== activeIngredientId
        ) {
          return false;
        }
        if (q.length === 0) return true;
        return r.title.toLowerCase().includes(q);
      })
      .sort((a, b) => a.title.localeCompare(b.title, "es"));
  }, [recipes, query, activeIngredientId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-background sm:h-auto sm:max-h-[85vh] sm:rounded-lg sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar receta…"
              autoFocus
              className="pl-9"
            />
          </div>

          {ingredientCounts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
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
                      "inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-0.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    <span className="capitalize">{ing.name}</span>
                    <span
                      className={cn(
                        "tabular-nums",
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
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Sin resultados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition-colors hover:text-primary"
                  >
                    <span className="font-medium">{r.title}</span>
                    {r.main_ingredient ? (
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {r.main_ingredient.name}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
