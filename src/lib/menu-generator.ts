import type { IngredientCategory } from "@/lib/ingredients";

export type MenuCandidate = {
  id: string;
  main_ingredient_normalized: string | null;
  main_ingredient_category: IngredientCategory | null;
};

export const DAYS_OF_WEEK = [
  "Lunes", "Martes", "Miércoles", "Jueves",
  "Viernes", "Sábado", "Domingo",
] as const;

/**
 * Devuelve la fecha del lunes (00:00 UTC) de la semana que contiene `date`.
 */
export function startOfWeekMonday(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay: 0=domingo, 1=lunes, ..., 6=sábado
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // si es domingo, retrocede 6; en otro caso al lunes
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type GenerateOpts = {
  recipes: MenuCandidate[];
  seasonalNormalizedNames: Set<string>;
  days?: number;
  /** Recetas que ya han sido elegidas para días previos (para penalizarlas). */
  previousMainIngredients?: (string | null)[];
  /** ID de receta que NO debe seleccionarse (cuando regeneramos un día concreto). */
  excludeRecipeId?: string;
  /** Función random inyectable para tests. */
  rng?: () => number;
};

function weightedPick(
  pool: MenuCandidate[],
  seasonalNames: Set<string>,
  rng: () => number,
): MenuCandidate {
  const weighted = pool.map((r) => ({
    recipe: r,
    weight:
      r.main_ingredient_normalized && seasonalNames.has(r.main_ingredient_normalized)
        ? 2
        : 1,
  }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let dart = rng() * total;
  for (const w of weighted) {
    dart -= w.weight;
    if (dart <= 0) return w.recipe;
  }
  return weighted[weighted.length - 1].recipe;
}

/**
 * Selecciona UNA receta aplicando reglas de variedad. Orden de preferencia:
 *   1. Sin repetir receta + sin repetir ingrediente principal en 2 días + máx 2 por categoría.
 *   2. Sin repetir receta + sin repetir ingrediente principal en 2 días (relaja categoría).
 *   3. Sin repetir receta (relaja también el ingrediente principal).
 *   4. Permite repetir receta — solo cuando no hay alternativa (recetario corto).
 *
 * Recetas con ingrediente principal de temporada tienen peso x2 en cualquier nivel.
 */
function pickOne(
  candidates: MenuCandidate[],
  alreadyPickedMain: (string | null)[],
  alreadyPickedCategoryCounts: Map<string, number>,
  alreadyPickedRecipeIds: Set<string>,
  seasonalNames: Set<string>,
  rng: () => number,
  excludeRecipeId?: string,
): MenuCandidate | null {
  if (candidates.length === 0) return null;

  const recentMain = new Set(alreadyPickedMain.slice(-2).filter(Boolean) as string[]);

  const noRepeat = candidates.filter(
    (r) => r.id !== excludeRecipeId && !alreadyPickedRecipeIds.has(r.id),
  );

  // 1. Estricto
  const strict = noRepeat.filter((r) => {
    if (r.main_ingredient_normalized && recentMain.has(r.main_ingredient_normalized)) return false;
    const cat = r.main_ingredient_category ?? "otro";
    if ((alreadyPickedCategoryCounts.get(cat) ?? 0) >= 2) return false;
    return true;
  });
  if (strict.length > 0) return weightedPick(strict, seasonalNames, rng);

  // 2. Relaja categoría
  const noCat = noRepeat.filter((r) => {
    if (r.main_ingredient_normalized && recentMain.has(r.main_ingredient_normalized)) return false;
    return true;
  });
  if (noCat.length > 0) return weightedPick(noCat, seasonalNames, rng);

  // 3. Solo evita repetir receta
  if (noRepeat.length > 0) return weightedPick(noRepeat, seasonalNames, rng);

  // 4. Último recurso: permite repetir receta (recetario corto)
  const allowRepeat = candidates.filter((r) => r.id !== excludeRecipeId);
  if (allowRepeat.length > 0) return weightedPick(allowRepeat, seasonalNames, rng);

  return weightedPick(candidates, seasonalNames, rng);
}

/**
 * Reemplaza la receta del día `dayIndex` aplicando los mismos criterios pero
 * teniendo en cuenta los días vecinos del menú actual.
 */
export function pickReplacementForDay({
  recipes,
  currentMenu,
  dayIndex,
  seasonalNormalizedNames,
  excludeRecipeId,
  rng = Math.random,
}: {
  recipes: MenuCandidate[];
  currentMenu: MenuCandidate[];
  dayIndex: number;
  seasonalNormalizedNames: Set<string>;
  excludeRecipeId?: string;
  rng?: () => number;
}): MenuCandidate | null {
  const mainHistory: (string | null)[] = currentMenu
    .filter((_, i) => i < dayIndex)
    .map((r) => r.main_ingredient_normalized);

  const categoryCounts = new Map<string, number>();
  const otherIds = new Set<string>();
  for (let i = 0; i < currentMenu.length; i++) {
    if (i === dayIndex) continue;
    const cat = currentMenu[i]?.main_ingredient_category ?? "otro";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    if (currentMenu[i]?.id) otherIds.add(currentMenu[i].id);
  }

  return pickOne(
    recipes,
    mainHistory,
    categoryCounts,
    otherIds,
    seasonalNormalizedNames,
    rng,
    excludeRecipeId,
  );
}
