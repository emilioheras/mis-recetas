"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS_OF_WEEK } from "@/lib/menu-generator";
import type { WeeklyMenuItemRow, WeeklyMenuRow } from "@/lib/menu-queries";
import {
  deleteMenuAction,
  regenerateDayAction,
  setMenuServingsAction,
} from "./actions";

type Props = {
  menu: WeeklyMenuRow;
  items: WeeklyMenuItemRow[];
};

export function MenuView({ menu, items }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [servingsValue, setServingsValue] = useState(String(menu.servings));

  const itemsByDay = new Map<number, WeeklyMenuItemRow>();
  for (const it of items) itemsByDay.set(it.day_of_week, it);

  function handleRegenerateDay(day: number) {
    setError(null);
    startTransition(async () => {
      const res = await regenerateDayAction(menu.id, day);
      if (!res.ok) setError(res.error);
    });
  }

  function handleDeleteMenu() {
    if (!window.confirm("¿Borrar el menú de esta semana?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMenuAction(menu.id);
      if (!res.ok) setError(res.error);
    });
  }

  function handleSaveServings() {
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
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-card p-4">
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
              disabled={isPending}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveServings}
              disabled={isPending || servingsValue === String(menu.servings)}
            >
              Guardar
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteMenu}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" /> Borrar menú
        </Button>
      </div>

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
                <div className="flex flex-1 items-baseline gap-3">
                  <span className="w-24 text-sm font-medium text-muted-foreground">
                    {dayName}
                  </span>
                  {item ? (
                    <Link
                      href={`/recetas/${item.recipe.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.recipe.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      (sin asignar)
                    </span>
                  )}
                  {item?.recipe.main_ingredient ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {item.recipe.main_ingredient.name}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerateDay(dayIndex)}
                  disabled={isPending}
                  aria-label={`Cambiar receta del ${dayName}`}
                >
                  <RefreshCw className="h-4 w-4" /> Cambiar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
