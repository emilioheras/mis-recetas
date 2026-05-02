import Link from "next/link";
import {
  Clock,
  Users,
  ArrowRight,
  Plus,
  Carrot,
  Apple,
  Fish,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSeasonalDashboard } from "@/lib/recipes/queries";
import { getSignedImageUrl } from "@/lib/recipes/image-storage";
import {
  getMonthName,
  getSeason,
  type SeasonCategory,
  type SeasonKey,
} from "@/lib/seasonal";

const CATEGORY_LABELS: Record<SeasonCategory, string> = {
  verdura: "Verduras",
  fruta: "Frutas",
  pescado: "Pescados y marisco",
};

const CATEGORY_ICONS: Record<SeasonCategory, LucideIcon> = {
  verdura: Carrot,
  fruta: Apple,
  pescado: Fish,
};

const SEASON_INTRO: Record<SeasonKey, string> = {
  primavera:
    "La cocina de temporada usa los productos en su punto natural y al mejor precio. Aprovecha lo que la primavera trae a los mercados.",
  verano:
    "La cocina de temporada usa los productos en su punto natural y al mejor precio. El verano regala frutas, hortalizas y pescados azules en su mejor momento.",
  otono:
    "La cocina de temporada usa los productos en su punto natural y al mejor precio. El otoño llega con calabazas, setas y frutos del bosque.",
  invierno:
    "La cocina de temporada usa los productos en su punto natural y al mejor precio. En invierno mandan las verduras de hoja, los cítricos y las legumbres.",
};

export default async function HomePage() {
  const dashboard = await getSeasonalDashboard(4);
  const season = getSeason(dashboard.month);
  const SeasonIcon = season.icon;
  const monthName = getMonthName(dashboard.month);

  const signedRecipes = await Promise.all(
    dashboard.recipes.map(async (r) => ({
      ...r,
      signedImageUrl: r.image_url ? await getSignedImageUrl(r.image_url) : null,
    })),
  );

  const hasAnyProducts =
    dashboard.products.verdura.length > 0 ||
    dashboard.products.fruta.length > 0 ||
    dashboard.products.pescado.length > 0;

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-5xl px-4 py-12 sm:py-16">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Estamos en · {monthName}
          </p>
          <div className="flex items-start justify-between gap-6">
            <h1 className="text-5xl sm:text-6xl">{season.label}</h1>
            <SeasonIcon className="mt-2 h-10 w-10 text-primary sm:h-12 sm:w-12" />
          </div>
          <p className="mt-6 max-w-2xl text-base text-foreground/70 sm:text-lg">
            {SEASON_INTRO[season.key]}
          </p>
        </div>
      </div>

      {hasAnyProducts ? (
        <section className="container max-w-5xl px-4 py-12">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70">
            Productos de temporada
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            Las píldoras rellenas son productos en{" "}
            <span className="font-medium text-foreground">pico de temporada</span>{" "}
            (su mejor momento). Las píldoras con borde están en temporada, pero
            mejorarán o ya empiezan a decaer.
          </p>

          <div className="space-y-8">
            {(Object.keys(dashboard.products) as SeasonCategory[]).map(
              (cat) => {
                const items = dashboard.products[cat];
                if (items.length === 0) return null;
                const CategoryIcon = CATEGORY_ICONS[cat];
                return (
                  <div key={cat}>
                    <h3 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
                      <CategoryIcon className="h-5 w-5 text-primary" />
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {items.map((p) => (
                        <li key={p.normalized}>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-[10px] border px-3 py-1 text-sm",
                              p.peak
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground",
                            )}
                          >
                            {p.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        </section>
      ) : null}

      <section className="container max-w-5xl px-4 pb-16 pt-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70">
            Recetas para esta temporada
          </h2>
          {signedRecipes.length > 0 ? (
            <Link
              href="/recetas"
              className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-primary transition-transform hover:translate-x-0.5"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {signedRecipes.length === 0 ? (
          dashboard.totalRecipes === 0 ? (
            <div className="py-8">
              <p className="mb-6 max-w-lg text-base text-muted-foreground">
                Aún no tienes recetas. Empieza añadiendo la primera para que las
                sugerencias de temporada cobren sentido.
              </p>
              <Button asChild size="lg">
                <Link href="/recetas/nueva">
                  <Plus className="h-4 w-4" /> Añadir mi primera receta
                </Link>
              </Button>
            </div>
          ) : (
            <p className="max-w-lg text-sm text-muted-foreground">
              Ninguna de tus recetas tiene un ingrediente principal de
              temporada este mes. Anímate a probar alguna nueva con los
              productos de arriba.
            </p>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {signedRecipes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/recetas/${r.id}`}
                  className="group block h-full overflow-hidden rounded-[10px] border border-border bg-background transition-colors hover:border-primary"
                >
                  <div className="relative aspect-[16/10] w-full bg-band">
                    {r.signedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.signedImageUrl}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.2em] text-foreground/40">
                        Sin imagen
                      </div>
                    )}
                    {r.isPeak ? (
                      <span className="absolute left-3 top-3 inline-flex items-center rounded-[10px] bg-primary px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground">
                        Pico
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    {r.main_ingredient ? (
                      <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                        {r.main_ingredient.name}
                      </p>
                    ) : null}
                    <h3 className="text-base font-semibold leading-tight transition-colors group-hover:text-primary">
                      {r.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {r.servings}
                      </span>
                      {r.prep_minutes ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {r.prep_minutes} min
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
