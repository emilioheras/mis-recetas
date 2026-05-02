"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS_OF_WEEK } from "@/lib/menu-generator";
import { assignRecipeToDayAction } from "@/app/(app)/menu/actions";

export type DayInfo = {
  dayIndex: number;
  recipeId: string | null;
  recipeTitle: string | null;
};

type Props = {
  recipeId: string;
  weekStart: string;
  weekLabel: string;
  days: DayInfo[];
};

export function AddToMenuButton({
  recipeId,
  weekStart,
  weekLabel,
  days,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justAssignedDay, setJustAssignedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setJustAssignedDay(null);
    }
  }, [open]);

  function handleAssign(dayIndex: number) {
    setError(null);
    startTransition(async () => {
      const res = await assignRecipeToDayAction(weekStart, dayIndex, recipeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setJustAssignedDay(dayIndex);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
      }, 700);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Al menú
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-background"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Añadir receta al menú"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">Añadir al menú</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {weekLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                aria-label="Cerrar"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error ? (
              <p className="border-b border-border px-5 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <ul className="divide-y divide-border">
              {days.map((d) => {
                const isCurrentRecipe = d.recipeId === recipeId;
                const isDone = justAssignedDay === d.dayIndex;
                return (
                  <li key={d.dayIndex}>
                    <button
                      type="button"
                      onClick={() => handleAssign(d.dayIndex)}
                      disabled={isPending || isCurrentRecipe}
                      className="flex w-full items-baseline justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-accent disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <span className="flex flex-1 items-baseline gap-3 truncate">
                        <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                          {DAYS_OF_WEEK[d.dayIndex]}
                        </span>
                        {d.recipeTitle ? (
                          <span
                            className={
                              isCurrentRecipe
                                ? "truncate text-foreground"
                                : "truncate text-foreground/80"
                            }
                          >
                            {d.recipeTitle}
                          </span>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">
                            (libre)
                          </span>
                        )}
                      </span>
                      {isDone ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : isCurrentRecipe ? (
                        <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                          ya
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border px-5 py-2 text-xs text-muted-foreground">
              Sustituye lo que haya en ese día.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
