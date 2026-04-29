"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateMenuAction } from "./actions";

export function GenerateMenuForm({ defaultServings }: { defaultServings: number }) {
  const [servings, setServings] = useState(String(defaultServings));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    const n = Number(servings);
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      setError("Comensales debe estar entre 1 y 20.");
      return;
    }
    startTransition(async () => {
      const res = await generateMenuAction(n);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="servings">Comensales</Label>
        <Input
          id="servings"
          type="number"
          min={1}
          max={20}
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="max-w-32"
          disabled={isPending}
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button onClick={handleSubmit} disabled={isPending}>
        <Sparkles className="h-4 w-4" />
        {isPending ? "Generando…" : "Generar menú de la semana"}
      </Button>
    </div>
  );
}
