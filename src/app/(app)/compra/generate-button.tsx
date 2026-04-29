"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateShoppingListAction } from "./actions";

export function GenerateListButton({ menuId }: { menuId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await generateShoppingListAction(menuId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isPending}>
        <Sparkles className="h-4 w-4" />
        {isPending ? "Generando…" : "Generar lista de la compra"}
      </Button>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
