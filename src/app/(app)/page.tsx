import Link from "next/link";
import { Sprout, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="container max-w-4xl py-8">
        <h1 className="mb-6 text-3xl font-bold">Receta del día</h1>
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay recetas en tu colección</CardTitle>
            <CardDescription>
              Empieza añadiendo tus primeras recetas. La &quot;receta del día&quot;
              {" "}aparecerá aquí, eligiendo automáticamente recetas con
              ingredientes de temporada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/recetas/nueva">Añadir mi primera receta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { recipe, seasonality } = today;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">Receta del día</h1>
        <span className="text-sm capitalize text-muted-foreground">
          {monthName}
        </span>
      </div>

      <Link
        href={`/recetas/${recipe.id}`}
        className="block rounded-xl border bg-card p-6 transition-colors hover:bg-accent"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-semibold">{recipe.title}</h2>
          <SeasonalityBadge seasonality={seasonality} />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {recipe.main_ingredient ? (
            <span className="rounded-full bg-secondary px-3 py-0.5 text-secondary-foreground">
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

        {seasonality === "off_season" ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Aún no tienes recetas con ingrediente de temporada para este mes.
            Añade alguna para que la sugerencia sea estacional.
          </p>
        ) : null}
      </Link>
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
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <Sprout className="h-3 w-3" />
      {seasonality === "peak" ? "Mes pico de temporada" : "De temporada"}
    </span>
  );
}
