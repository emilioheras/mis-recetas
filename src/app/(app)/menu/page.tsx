import { createClient } from "@/lib/supabase/server";
import { listRecipes } from "@/lib/recipes/queries";
import { getMenuByWeekStart } from "@/lib/menu-queries";
import { startOfWeekMonday, toIsoDate } from "@/lib/menu-generator";
import { MenuView } from "./menu-view";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

async function getDefaultServings(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 2;
  const { data } = await supabase
    .from("users")
    .select("household:households (default_servings)")
    .eq("id", user.id)
    .maybeSingle();
  const def = (data as unknown as {
    household: { default_servings: number } | null;
  } | null)?.household?.default_servings;
  return def ?? 2;
}

export default async function MenuPage() {
  const monday = startOfWeekMonday();
  const weekStart = toIsoDate(monday);
  const [data, defaultServings, recipes] = await Promise.all([
    getMenuByWeekStart(weekStart),
    getDefaultServings(),
    listRecipes(),
  ]);

  const weekLabel = formatWeekLabel(monday);

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-4xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Tu plan de la semana
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-4xl sm:text-5xl">Menú semanal</h1>
            <span className="text-sm text-foreground/70">{weekLabel}</span>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-8">
        <MenuView
          weekStart={weekStart}
          menu={data?.menu ?? null}
          items={data?.items ?? []}
          defaultServings={defaultServings}
          recipes={recipes}
        />
      </div>
    </div>
  );
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const m1 = MONTH_NAMES[monday.getUTCMonth()];
  const m2 = MONTH_NAMES[sunday.getUTCMonth()];
  const d1 = monday.getUTCDate();
  const d2 = sunday.getUTCDate();
  if (m1 === m2) return `${d1}–${d2} de ${m1}`;
  return `${d1} ${m1} – ${d2} ${m2}`;
}
