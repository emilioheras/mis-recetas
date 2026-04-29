"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRecipeAction } from "../actions";

export function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteRecipeAction(recipeId);
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label="Borrar receta"
      >
        <Trash2 className="h-4 w-4" /> Borrar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">¿Seguro?</span>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Borrando…" : "Sí, borrar"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        No
      </Button>
    </div>
  );
}
