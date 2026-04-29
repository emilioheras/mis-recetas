import Link from "next/link";
import { Sprout, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecipeOfTheDay } from "@/lib/recipes/queries";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

export default async function HomePage() {
  const today = await getRecipeOfTheDay();
  const monthName = MONTH_NAMES[new Date().getMonth()];

  if (!today) {
    return (
      <div className="container max-w-4xl px-4 py-20 sm:py-32">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Receta del día · {monthName}
        </p>
        <h1 className="mb-6 text-5xl leading-[0.95] sm:text-7xl">
          Sin recetas
          <br />
          todavía.
        </h1>
        <p className="mb-10 max-w-lg text-lg text-muted-foreground">
          Empieza añadiendo tus primeras recetas. La sugerencia diaria se
          adapta al mes y prioriza ingredientes de temporada.
        </p>
        <Button asChild size="lg">
          <Link href="/recetas/nueva">
            Añadir mi primera receta <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const { recipe, seasonality } = today;

  return (
    <div className="container max-w-5xl px-4 py-12 sm:py-20">
      <p className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Receta del día · {monthName}
      </p>

      <Link
        href={`/recetas/${recipe.id}`}
        className="group block"
      >
        <h1 className="text-5xl leading-[0.95] transition-colors group-hover:text-primary sm:text-7xl md:text-8xl">
          {recipe.title}
        </h1>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          {recipe.main_ingredient ? (
            <span className="font-medium uppercase tracking-wider">
              {recipe.main_ingredient.name}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            {recipe.servings} comensales
          </span>
          {recipe.prep_minutes ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {recipe.prep_minutes} min
            </span>
          ) : null}
          <SeasonalityBadge seasonality={seasonality} />
        </div>

        <p className="mt-12 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary transition-transform group-hover:translate-x-1">
          Ver receta <ArrowRight className="h-4 w-4" />
        </p>
      </Link>

      {seasonality === "off_season" ? (
        <p className="mt-16 max-w-md text-sm text-muted-foreground">
          Aún no tienes recetas con ingrediente de temporada para este mes.
          Añade alguna para que la sugerencia sea estacional.
        </p>
      ) : null}
    </div>
  );
}

function SeasonalityBadge({
  seasonality,
}: {
  seasonality: "peak" | "in_season" | "off_season";
}) {
  if (seasonality === "off_season") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
      <Sprout className="h-3 w-3" />
      {seasonality === "peak" ? "Pico de temporada" : "De temporada"}
    </span>
  );
}
