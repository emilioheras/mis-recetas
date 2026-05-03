"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryWithCount } from "@/lib/recipes/queries";
import type { TrickCategoryWithCount } from "@/lib/tricks/queries";
import {
  createRecipeCategoryAction,
  createTrickCategoryAction,
  deleteRecipeCategoryAction,
  deleteTrickCategoryAction,
  renameRecipeCategoryAction,
  renameTrickCategoryAction,
} from "./actions";

type Props = {
  recipeCategories: CategoryWithCount[];
  trickCategories: TrickCategoryWithCount[];
};

type Kind = "recipe" | "trick";

type Row = {
  id: string;
  name: string;
  count: number;
  kind: Kind;
  countLabel: (n: number) => string;
};

function recipeCountLabel(n: number) {
  return n === 0 ? "sin recetas" : n === 1 ? "1 receta" : `${n} recetas`;
}
function trickCountLabel(n: number) {
  return n === 0 ? "sin trucos" : n === 1 ? "1 truco" : `${n} trucos`;
}

export function CategoriesView({ recipeCategories, trickCategories }: Props) {
  const recipeRows: Row[] = recipeCategories.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.recipe_count,
    kind: "recipe",
    countLabel: recipeCountLabel,
  }));
  const trickRows: Row[] = trickCategories.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.trick_count,
    kind: "trick",
    countLabel: trickCountLabel,
  }));

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Section
        title="Recetas"
        kind="recipe"
        rows={recipeRows}
        emptyText="Aún no has creado ninguna categoría de receta."
        placeholder="Cremas, Ensaladas, Navidad…"
      />
      <Section
        title="Trucos"
        kind="trick"
        rows={trickRows}
        emptyText="Aún no has creado ninguna categoría de truco."
        placeholder="Cuchillos, Conservación…"
      />
    </div>
  );
}

function Section({
  title,
  kind,
  rows,
  emptyText,
  placeholder,
}: {
  title: string;
  kind: Kind;
  rows: Row[];
  emptyText: string;
  placeholder: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
        {title}
      </h2>
      <AddCategoryForm kind={kind} placeholder={placeholder} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="rounded-[10px] border bg-card divide-y divide-border/60">
          {rows.map((row) => (
            <CategoryRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddCategoryForm({
  kind,
  placeholder,
}: {
  kind: Kind;
  placeholder: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const action =
        kind === "recipe"
          ? createRecipeCategoryAction
          : createTrickCategoryAction;
      const res = await action(trimmed);
      if (res.ok) {
        setName("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          disabled={isPending}
          aria-label="Nueva categoría"
          className="h-9 flex-1"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending || !name.trim()}
        >
          <Plus className="h-4 w-4" /> Añadir
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}

function CategoryRow({ row }: { row: Row }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.name);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(row.name);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function submitEdit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (trimmed === row.name) {
      setEditing(false);
      setError(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const action =
        row.kind === "recipe"
          ? renameRecipeCategoryAction
          : renameTrickCategoryAction;
      const res = await action(row.id, trimmed);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete() {
    const itemNoun = row.kind === "recipe" ? "recetas" : "trucos";
    const msg =
      row.count === 0
        ? `¿Borrar la categoría "${row.name}"?`
        : `¿Borrar la categoría "${row.name}"? Se desvincularán ${row.count} ${itemNoun}. Las ${itemNoun} seguirán existiendo.`;
    if (!window.confirm(msg)) return;

    setError(null);
    startTransition(async () => {
      const action =
        row.kind === "recipe"
          ? deleteRecipeCategoryAction
          : deleteTrickCategoryAction;
      const res = await action(row.id);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-1.5 px-4 py-2.5">
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              autoFocus
              disabled={isPending}
              className="h-8 flex-1"
            />
            <button
              type="button"
              onClick={submitEdit}
              disabled={isPending}
              aria-label="Guardar"
              title="Guardar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              aria-label="Cancelar"
              title="Cancelar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 capitalize">{row.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {row.countLabel(row.count)}
            </span>
            <button
              type="button"
              onClick={startEdit}
              disabled={isPending}
              aria-label={`Renombrar ${row.name}`}
              title="Renombrar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              aria-label={`Borrar ${row.name}`}
              title="Borrar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </li>
  );
}
