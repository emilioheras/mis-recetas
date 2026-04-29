import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecipe } from "@/lib/recipes/queries";
import { UNITS } from "@/lib/ingredients";
import { DeleteRecipeButton } from "./delete-button";

const UNIT_LABEL = Object.fromEntries(UNITS.map((u) => [u.value, u.label]));

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const otherIngredients = recipe.ingredients
    .filter((row) => !row.is_main)
    .sort((a, b) => a.position - b.position);

  return (
    <article className="container max-w-3xl py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {recipe.main_ingredient ? (
              <span className="rounded-full bg-accent px-3 py-0.5 text-accent-foreground">
                {recipe.main_ingredient.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {recipe.servings} comensales
            </span>
            {recipe.prep_minutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> {recipe.prep_minutes} min
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/recetas/${recipe.id}/editar`}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
          <DeleteRecipeButton recipeId={recipe.id} />
        </div>
      </header>

      {recipe.video_url ? (
        <div className="mb-6 aspect-video overflow-hidden rounded-lg">
          <iframe
            src={toEmbedUrl(recipe.video_url)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <section className="mb-6 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Ingredientes</h2>
        <ul className="space-y-1.5 text-sm">
          {otherIngredients.length === 0 ? (
            <li className="text-muted-foreground">
              Solo {recipe.main_ingredient?.name ?? "ingredientes principales"}.
            </li>
          ) : (
            otherIngredients.map((row) => (
              <li key={row.id} className="flex justify-between gap-3">
                <span>{row.ingredient.name}</span>
                <span className="text-muted-foreground">
                  {row.quantity ? `${row.quantity} ` : ""}
                  {UNIT_LABEL[row.unit] ?? row.unit}
                  {row.notes ? ` · ${row.notes}` : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {recipe.instructions_md ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Pasos</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7">
            {recipe.instructions_md}
          </pre>
        </section>
      ) : null}

      {recipe.source_url ? (
        <p className="text-xs text-muted-foreground">
          Fuente:{" "}
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {recipe.source_url}
          </a>
        </p>
      ) : null}

      {recipe.notes ? (
        <section className="mt-6 rounded-lg bg-muted p-4 text-sm">
          <strong className="block mb-1">Notas</strong>
          {recipe.notes}
        </section>
      ) : null}
    </article>
  );
}

function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
  } catch {}
  return url;
}
