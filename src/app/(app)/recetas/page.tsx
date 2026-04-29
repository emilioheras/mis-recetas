import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listRecipes } from "@/lib/recipes/queries";
import type { RecipeListItem } from "@/lib/recipes/types";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recipes = await listRecipes(q);
  const groups = groupByMainIngredient(recipes);

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Button asChild>
          <Link href="/recetas/nueva">
            <Plus className="h-4 w-4" /> Nueva receta
          </Link>
        </Button>
      </div>

      <form className="mb-6 flex items-center gap-2" action="/recetas">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {recipes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {q ? "Sin resultados" : "Aún no tienes recetas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {q ? (
              <p className="text-sm text-muted-foreground">
                Prueba con otra búsqueda o{" "}
                <Link href="/recetas" className="underline">
                  ver todas
                </Link>
                .
              </p>
            ) : (
              <Button asChild>
                <Link href="/recetas/nueva">Crear mi primera receta</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-lg font-semibold capitalize">
                {group.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.recipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recetas/${recipe.id}`}
                    className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="font-medium">{recipe.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {recipe.servings} comensales
                      {recipe.prep_minutes
                        ? ` · ${recipe.prep_minutes} min`
                        : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

type Group = { key: string; label: string; recipes: RecipeListItem[] };

function groupByMainIngredient(recipes: RecipeListItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const recipe of recipes) {
    const ing = recipe.main_ingredient;
    const key = ing?.id ?? "__sin_principal__";
    const label = ing?.name ?? "Sin ingrediente principal";
    if (!map.has(key)) {
      map.set(key, { key, label, recipes: [] });
    }
    map.get(key)!.recipes.push(recipe);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
}
