import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  getMenuByWeekStart,
} from "@/lib/menu-queries";
import { startOfWeekMonday, toIsoDate } from "@/lib/menu-generator";
import { MenuView } from "./menu-view";
import { GenerateMenuForm } from "./generate-form";

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
  const data = await getMenuByWeekStart(weekStart);
  const defaultServings = await getDefaultServings();

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
        {!data ? (
          <Card>
            <CardHeader>
              <CardTitle>Aún no has generado el menú de esta semana</CardTitle>
              <CardDescription>
                Eligiremos 7 recetas de tu colección, dándole prioridad a las
                que tengan ingrediente principal de temporada y evitando que
                se repita demasiado el mismo tipo de plato. Puedes cambiar
                cualquier día sobre la marcha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateMenuForm defaultServings={defaultServings} />
              <p className="mt-4 text-xs text-muted-foreground">
                ¿No tienes recetas? <Link href="/recetas/nueva" className="underline">Añade alguna primero</Link>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <MenuView menu={data.menu} items={data.items} />
        )}
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
