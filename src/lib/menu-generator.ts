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

/**
 * Selecciona UNA receta aplicando reglas de variedad:
 *   - Recetas con ingrediente principal de temporada: peso x2.
 *   - Excluye recetas cuyo ingrediente principal aparezca en los 2 días previos.
 *   - Excluye recetas cuya categoría ya esté 2 veces en la semana.
 *   - Si tras filtrar el pool queda vacío, relaja primero la categoría y luego todo.
 */
function pickOne(
  candidates: MenuCandidate[],
  alreadyPickedMain: (string | null)[],
  alreadyPickedCategoryCounts: Map<string, number>,
  seasonalNames: Set<string>,
  rng: () => number,
  excludeRecipeId?: string,
): MenuCandidate | null {
  if (candidates.length === 0) return null;

  const recentMain = new Set(alreadyPickedMain.slice(-2).filter(Boolean) as string[]);

  function withWeight(pool: MenuCandidate[]): { recipe: MenuCandidate; weight: number }[] {
    return pool.map((r) => ({
      recipe: r,
      weight:
        r.main_ingredient_normalized && seasonalNames.has(r.main_ingredient_normalized)
          ? 2
          : 1,
    }));
  }

  const baseFiltered = candidates.filter((r) => r.id !== excludeRecipeId);

  const strict = baseFiltered.filter((r) => {
    if (r.main_ingredient_normalized && recentMain.has(r.main_ingredient_normalized)) return false;
    const cat = r.main_ingredient_category ?? "otro";
    if ((alreadyPickedCategoryCounts.get(cat) ?? 0) >= 2) return false;
    return true;
  });

  let pool = strict;
  if (pool.length === 0) {
    // Relaja categoría
    pool = baseFiltered.filter((r) => {
      if (r.main_ingredient_normalized && recentMain.has(r.main_ingredient_normalized)) return false;
      return true;
    });
  }
  if (pool.length === 0) {
    // Relaja todo
    pool = baseFiltered.length > 0 ? baseFiltered : candidates;
  }

  const weighted = withWeight(pool);
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let dart = rng() * total;
  for (const w of weighted) {
    dart -= w.weight;
    if (dart <= 0) return w.recipe;
  }
  return weighted[weighted.length - 1].recipe;
}

export function generateWeeklyMenu({
  recipes,
  seasonalNormalizedNames,
  days = 7,
  rng = Math.random,
}: GenerateOpts): MenuCandidate[] {
  if (recipes.length === 0) return [];

  const result: MenuCandidate[] = [];
  const mainHistory: (string | null)[] = [];
  const categoryCounts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const picked = pickOne(recipes, mainHistory, categoryCounts, seasonalNormalizedNames, rng);
    if (!picked) break;
    result.push(picked);
    mainHistory.push(picked.main_ingredient_normalized);
    const cat = picked.main_ingredient_category ?? "otro";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  return result;
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
  for (let i = 0; i < currentMenu.length; i++) {
    if (i === dayIndex) continue;
    const cat = currentMenu[i]?.main_ingredient_category ?? "otro";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  return pickOne(
    recipes,
    mainHistory,
    categoryCounts,
    seasonalNormalizedNames,
    rng,
    excludeRecipeId,
  );
}
