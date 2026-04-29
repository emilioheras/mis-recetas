"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/shopping";
import { UNITS, type IngredientCategory } from "@/lib/ingredients";
import type { ShoppingList, ShoppingListItem } from "@/lib/shopping-queries";
import {
  generateShoppingListAction,
  toggleShoppingItemAction,
  deleteShoppingListAction,
} from "./actions";

const UNIT_LABEL = Object.fromEntries(UNITS.map((u) => [u.value, u.label]));

type Props = {
  menuId: string;
  menuServings: number;
  list: ShoppingList;
};

export function ShoppingView({ menuId, menuServings, list }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Optimistic state of checked items
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(list.items.map((it) => [it.id, it.checked])),
  );

  const grouped = groupByCategory(list.items);
  const total = list.items.length;
  const checkedCount = list.items.filter((it) => checkedMap[it.id]).length;

  function handleToggle(itemId: string, current: boolean) {
    setCheckedMap((prev) => ({ ...prev, [itemId]: !current }));
    startTransition(async () => {
      const res = await toggleShoppingItemAction(itemId, !current);
      if (!res.ok) {
        setCheckedMap((prev) => ({ ...prev, [itemId]: current }));
        setError(res.error);
      }
    });
  }

  function handleRegenerate() {
    if (!window.confirm("Regenerar la lista borra los tachados. ¿Seguir?")) return;
    setError(null);
    startTransition(async () => {
      const res = await generateShoppingListAction(menuId);
      if (!res.ok) setError(res.error);
    });
  }

  function handleDelete() {
    if (!window.confirm("¿Borrar la lista de la compra?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteShoppingListAction(list.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="text-sm">
          <strong>{checkedCount}</strong> de <strong>{total}</strong>{" "}
          ingredientes marcados · escalada para{" "}
          <strong>{menuServings} comensales</strong>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isPending}
          >
            <RefreshCw className="h-4 w-4" /> Regenerar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" /> Borrar
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </h2>
              <ul className="divide-y rounded-lg border bg-card">
                {items
                  .slice()
                  .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, "es"))
                  .map((item) => {
                    const checked = checkedMap[item.id] ?? false;
                    return (
                      <li key={item.id} className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(item.id, checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span
                          className={cn(
                            "flex-1 capitalize",
                            checked && "text-muted-foreground line-through",
                          )}
                        >
                          {item.ingredient.name}
                        </span>
                        <span
                          className={cn(
                            "text-sm tabular-nums text-muted-foreground",
                            checked && "line-through",
                          )}
                        >
                          {formatQuantity(item.total_quantity, item.unit)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function groupByCategory(items: ShoppingListItem[]): Map<IngredientCategory, ShoppingListItem[]> {
  const map = new Map<IngredientCategory, ShoppingListItem[]>();
  for (const it of items) {
    const cat = it.ingredient.category;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(it);
  }
  return map;
}

function formatQuantity(qty: number | null, unit: string): string {
  const unitLabel = UNIT_LABEL[unit] ?? unit;
  if (qty == null) return unitLabel;
  // Quita el .00 final si es entero
  const formatted = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted} ${unitLabel}`;
}
