"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrickListItem } from "@/lib/tricks/types";

type Props = {
  tricks: TrickListItem[];
};

export function TricksBrowser({ tricks }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const t of tricks) {
      for (const c of t.categories) {
        const entry = map.get(c.id);
        if (entry) entry.count += 1;
        else map.set(c.id, { id: c.id, name: c.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [tricks]);

  const filtered = useMemo(() => {
    if (!activeCategoryId) return tricks;
    return tricks.filter((t) =>
      t.categories.some((c) => c.id === activeCategoryId),
    );
  }, [tricks, activeCategoryId]);

  const hasCategories = categoryCounts.length > 0;

  return (
    <div>
      {hasCategories && activeCategoryId ? (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtrando por:</span>
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className="inline-flex items-center gap-1 rounded-[10px] border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <X className="h-3 w-3" />
            {categoryCounts.find((c) => c.id === activeCategoryId)?.name ??
              "categoría"}
          </button>
        </div>
      ) : null}

      {hasCategories ? (
        <div className="mb-6 md:hidden">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="trick-category-mobile"
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
            id="trick-category-mobile"
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
              Sin trucos para los filtros activos.{" "}
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className="text-primary underline-offset-4 hover:underline"
              >
                Limpiar filtros
              </button>
              .
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((trick) => (
                <li key={trick.id}>
                  <Link
                    href={`/trucos/${trick.id}`}
                    className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 transition-colors"
                  >
                    <span className="text-lg font-medium leading-snug transition-colors group-hover:text-primary">
                      {trick.title}
                    </span>
                    {trick.categories.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {trick.categories.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                          >
                            {c.name}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasCategories ? (
          <aside className="hidden md:block">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground font-sans">
              Categorías
            </h2>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveCategoryId(null)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                    !activeCategoryId
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  <span>Todas</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {tricks.length}
                  </span>
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
                        "flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                        active
                          ? "bg-secondary font-medium text-secondary-foreground"
                          : "hover:bg-accent",
                      )}
                    >
                      <span>{c.name}</span>
                      <span
                        className={cn(
                          "tabular-nums text-xs",
                          active ? "text-secondary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {c.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/categorias"
              className="mt-5 inline-block px-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Gestionar →
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
