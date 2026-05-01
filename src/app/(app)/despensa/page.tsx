import { listIngredientsWithRecipeCount } from "@/lib/recipes/queries";
import { PantryView } from "./pantry-view";

export default async function DespensaPage() {
  const ingredients = await listIngredientsWithRecipeCount();

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-5xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Lo que tienes siempre en casa
          </p>
          <h1 className="text-4xl sm:text-5xl">Despensa</h1>
          <p className="mt-3 max-w-xl text-sm text-foreground/70">
            Marca lo que tienes siempre. No aparecerá en la lista de la compra,
            pero sí en la sección final &laquo;Ya en tu despensa&raquo; como
            recordatorio por si te queda poca cantidad.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-8">
        <PantryView ingredients={ingredients} />
      </div>
    </div>
  );
}
