import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Pencil, Clock, Users, FileText, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecipe } from "@/lib/recipes/queries";
import { getSignedPdfUrl } from "@/lib/recipes/pdf-storage";
import { getSignedImageUrl } from "@/lib/recipes/image-storage";
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

  const allIngredients = recipe.ingredients
    .slice()
    .sort((a, b) => {
      // El principal va arriba; el resto por orden de posición.
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return a.position - b.position;
    });

  const [pdfSignedUrl, imageSignedUrl] = await Promise.all([
    recipe.pdf_url ? getSignedPdfUrl(recipe.pdf_url) : Promise.resolve(null),
    recipe.image_url ? getSignedImageUrl(recipe.image_url) : Promise.resolve(null),
  ]);

  return (
    <article className="container max-w-3xl px-4 py-10">
      <Link
        href="/recetas"
        className="mb-8 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Recetas
      </Link>

      {imageSignedUrl ? (
        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-md border bg-muted">
          <Image
            src={imageSignedUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            unoptimized
            priority
          />
        </div>
      ) : null}

      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          {recipe.main_ingredient ? (
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {recipe.main_ingredient.name}
            </p>
          ) : null}
          <h1 className="text-5xl leading-[1.05] sm:text-6xl">{recipe.title}</h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {recipe.servings} comensales
            </span>
            {recipe.prep_minutes ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {recipe.prep_minutes} min
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/recetas/${recipe.id}/editar`}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
          <DeleteRecipeButton recipeId={recipe.id} />
        </div>
      </header>

      {recipe.video_url ? (
        <div className="mb-10 aspect-video overflow-hidden rounded-md">
          <iframe
            src={toEmbedUrl(recipe.video_url)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {pdfSignedUrl ? (
        <div className="mb-10">
          <iframe
            src={pdfSignedUrl}
            title="PDF de la receta"
            className="h-[70vh] w-full rounded-md border"
          />
          <a
            href={pdfSignedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <FileText className="h-3 w-3" /> Abrir PDF en pestaña aparte
          </a>
        </div>
      ) : null}

      <div className="grid gap-12 md:grid-cols-[280px_1fr]">
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground font-sans">
            Ingredientes
          </h2>
          <ul className="space-y-2 text-sm">
            {allIngredients.length === 0 ? (
              <li className="text-muted-foreground">Sin ingredientes.</li>
            ) : (
              allIngredients.map((row) => (
                <li
                  key={row.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1.5"
                >
                  <span className="flex items-baseline gap-1.5 capitalize">
                    {row.is_main ? (
                      <Star
                        className="h-3 w-3 shrink-0 self-center text-amber-500"
                        fill="currentColor"
                        aria-label="Ingrediente principal"
                      />
                    ) : null}
                    {row.ingredient.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.quantity ? `${row.quantity} ` : ""}
                    {UNIT_LABEL[row.unit] ?? row.unit}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          {recipe.instructions_md ? (
            <>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground font-sans">
                Pasos
              </h2>
              <div className="whitespace-pre-wrap text-base leading-[1.75]">
                {recipe.instructions_md}
              </div>
            </>
          ) : null}

          {recipe.notes ? (
            <div className="mt-10 border-l-2 border-primary/40 pl-4 text-sm italic text-muted-foreground">
              {recipe.notes}
            </div>
          ) : null}

          {recipe.source_url ? (
            <p className="mt-10 text-xs text-muted-foreground">
              Fuente:{" "}
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {recipe.source_url}
              </a>
            </p>
          ) : null}
        </section>
      </div>
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
