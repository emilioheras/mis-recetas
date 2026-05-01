"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTrickAction } from "../actions";

export function DeleteTrickButton({ trickId }: { trickId: string }) {
  const [isPending, startTransition] = useTransition();
  function handleClick() {
    if (!window.confirm("¿Borrar este truco? No se puede deshacer.")) return;
    startTransition(() => deleteTrickAction(trickId));
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" /> Borrar
    </Button>
  );
}
