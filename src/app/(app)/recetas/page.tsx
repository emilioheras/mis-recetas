import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listRecipes } from "@/lib/recipes/queries";
import { RecipesBrowser } from "./recipes-browser";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recipes = await listRecipes(q);

  return (
    <div className="container max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Tu colección
          </p>
          <h1 className="text-4xl sm:text-5xl">Recetas</h1>
        </div>
        <Button asChild>
          <Link href="/recetas/nueva">
            <Plus className="h-4 w-4" /> Nueva
          </Link>
        </Button>
      </div>

      <form className="mb-8 flex items-center gap-2" action="/recetas">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar receta…"
            className="border-0 border-b border-border bg-transparent pl-9 text-base focus-visible:rounded-none focus-visible:border-foreground focus-visible:ring-0 rounded-none"
          />
        </div>
        {q ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/recetas">Limpiar</Link>
          </Button>
        ) : null}
      </form>

      {recipes.length === 0 ? (
        <div className="py-16">
          <h2 className="mb-3 text-2xl">
            {q ? "Sin resultados" : "Aún no tienes recetas"}
          </h2>
          {q ? (
            <p className="text-muted-foreground">
              Prueba con otra búsqueda o{" "}
              <Link href="/recetas" className="text-primary underline-offset-4 hover:underline">
                ver todas
              </Link>
              .
            </p>
          ) : (
            <Button asChild>
              <Link href="/recetas/nueva">Crear mi primera receta</Link>
            </Button>
          )}
        </div>
      ) : (
        <RecipesBrowser recipes={recipes} />
      )}
    </div>
  );
}
