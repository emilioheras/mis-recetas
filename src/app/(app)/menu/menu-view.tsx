"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Shuffle,
  Trash,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS_OF_WEEK } from "@/lib/menu-generator";
import type { WeeklyMenuItemRow, WeeklyMenuRow } from "@/lib/menu-queries";
import type { RecipeListItem } from "@/lib/recipes/types";
import {
  assignRecipeToDayAction,
  clearMenuAction,
  deleteMenuAction,
  fillEmptyDaysAction,
  regenerateDayAction,
  setMenuServingsAction,
  unassignDayAction,
} from "./actions";
import { RecipePickerModal } from "./recipe-picker-modal";

type Props = {
  weekStart: string;
  menu: WeeklyMenuRow | null;
  items: WeeklyMenuItemRow[];
  defaultServings: number;
  recipes: RecipeListItem[];
};

export function MenuView({
  weekStart,
  menu,
  items,
  defaultServings,
  recipes,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [servingsValue, setServingsValue] = useState(
    String(menu?.servings ?? defaultServings),
  );
  const [pickerOpenForDay, setPickerOpenForDay] = useState<number | null>(null);

  const itemsByDay = new Map<number, WeeklyMenuItemRow>();
  for (const it of items) itemsByDay.set(it.day_of_week, it);

  const assignedCount = items.length;
  const hasEmptyDays = assignedCount < 7;
  const noRecipes = recipes.length === 0;

  function handleAssign(dayIndex: number, recipeId: string) {
    setPickerOpenForDay(null);
    setError(null);
    startTransition(async () => {
      const res = await assignRecipeToDayAction(weekStart, dayIndex, recipeId);
      if (!res.ok) setError(res.error);
    });
  }

  function handleRandomDay(dayIndex: number) {
    setError(null);
    startTransition(async () => {
      const res = await regenerateDayAction(weekStart, dayIndex);
      if (!res.ok) setError(res.error);
    });
  }

  function handleUnassign(dayIndex: number) {
    if (!menu) return;
    setError(null);
    startTransition(async () => {
      const res = await unassignDayAction(menu.id, dayIndex);
      if (!res.ok) setError(res.error);
    });
  }

  function handleFillEmpty() {
    setError(null);
    startTransition(async () => {
      const res = await fillEmptyDaysAction(weekStart);
      if (!res.ok) setError(res.error);
    });
  }

  function handleClear() {
    if (!menu) return;
    if (!window.confirm("¿Vaciar todos los días del menú?")) return;
    setError(null);
    startTransition(async () => {
      const res = await clearMenuAction(menu.id);
      if (!res.ok) setError(res.error);
    });
  }

  function handleDeleteMenu() {
    if (!menu) return;
    if (!window.confirm("¿Borrar el menú de esta semana?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMenuAction(menu.id);
      if (!res.ok) setError(res.error);
    });
  }

  function handleSaveServings() {
    if (!menu) return;
    const n = Number(servingsValue);
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      setError("Comensales debe estar entre 1 y 20.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setMenuServingsAction(menu.id, n);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-2">
          <Label htmlFor="servings" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Comensales
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="servings"
              type="number"
              min={1}
              max={20}
              className="w-24"
              value={servingsValue}
              onChange={(e) => setServingsValue(e.target.value)}
              disabled={isPending || !menu}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveServings}
              disabled={
                isPending ||
                !menu ||
                servingsValue === String(menu?.servings)
              }
            >
              Guardar
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasEmptyDays ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleFillEmpty}
              disabled={isPending || noRecipes}
            >
              <Shuffle className="h-4 w-4" />
              {assignedCount === 0 ? "Rellenar todo aleatorio" : "Rellenar huecos"}
            </Button>
          ) : null}
          {assignedCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isPending}
            >
              <Trash className="h-4 w-4" /> Vaciar todo
            </Button>
          ) : null}
          {menu ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteMenu}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" /> Borrar menú
            </Button>
          ) : null}
        </div>
      </div>

      {noRecipes ? (
        <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          No tienes recetas todavía.{" "}
          <Link href="/recetas/nueva" className="underline">
            Añade alguna primero
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {DAYS_OF_WEEK.map((dayName, dayIndex) => {
          const item = itemsByDay.get(dayIndex);
          return (
            <Card key={dayIndex}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex flex-1 flex-wrap items-baseline gap-3">
                  <span className="w-24 text-sm font-medium text-muted-foreground">
                    {dayName}
                  </span>
                  {item ? (
                    <>
                      <Link
                        href={`/recetas/${item.recipe.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.recipe.title}
                      </Link>
                      {item.recipe.main_ingredient ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {item.recipe.main_ingredient.name}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      (sin asignar)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPickerOpenForDay(dayIndex)}
                    disabled={isPending || noRecipes}
                  >
                    {item ? (
                      <>
                        <RefreshCw className="h-4 w-4" /> Elegir otra
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Elegir
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRandomDay(dayIndex)}
                    disabled={isPending || noRecipes}
                    aria-label={
                      item
                        ? `Cambiar receta del ${dayName} al azar`
                        : `Asignar receta aleatoria al ${dayName}`
                    }
                  >
                    <Shuffle className="h-4 w-4" /> Aleatorio
                  </Button>
                  {item ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(dayIndex)}
                      disabled={isPending}
                      aria-label={`Quitar receta del ${dayName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RecipePickerModal
        open={pickerOpenForDay !== null}
        title={
          pickerOpenForDay !== null
            ? `Elegir receta para ${DAYS_OF_WEEK[pickerOpenForDay]}`
            : ""
        }
        recipes={recipes}
        onClose={() => setPickerOpenForDay(null)}
        onSelect={(recipeId) => {
          if (pickerOpenForDay !== null) handleAssign(pickerOpenForDay, recipeId);
        }}
      />
    </div>
  );
}
