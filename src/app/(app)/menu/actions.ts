"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";
import {
  fetchCandidatesForMenu,
  fetchSeasonalNamesForMonth,
} from "@/lib/menu-queries";
import {
  generateWeeklyMenu,
  pickReplacementForDay,
  startOfWeekMonday,
  toIsoDate,
  type MenuCandidate,
} from "@/lib/menu-generator";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function generateMenuAction(servings: number): Promise<ActionResult> {
  if (!Number.isFinite(servings) || servings < 1 || servings > 20) {
    return { ok: false, error: "Comensales debe estar entre 1 y 20." };
  }

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    const candidates = await fetchCandidatesForMenu();
    if (candidates.length === 0) {
      return {
        ok: false,
        error: "Necesitas al menos una receta guardada para generar un menú.",
      };
    }

    const month = new Date().getMonth() + 1;
    const seasonal = await fetchSeasonalNamesForMonth(month);
    const selected = generateWeeklyMenu({
      recipes: candidates,
      seasonalNormalizedNames: seasonal,
    });

    const weekStart = toIsoDate(startOfWeekMonday());

    // Borra menú existente de esta semana (si lo hay) y crea uno nuevo
    await supabase
      .from("weekly_menus")
      .delete()
      .eq("household_id", householdId)
      .eq("week_start_date", weekStart);

    const { data: menu, error: menuError } = await supabase
      .from("weekly_menus")
      .insert({
        household_id: householdId,
        week_start_date: weekStart,
        servings: Math.round(servings),
      })
      .select("id")
      .single();
    if (menuError || !menu) throw new Error(menuError?.message ?? "Error creando el menú");

    const itemRows = selected.map((recipe, day) => ({
      menu_id: menu.id,
      recipe_id: recipe.id,
      day_of_week: day,
      meal: "comida" as const,
    }));
    if (itemRows.length > 0) {
      const { error } = await supabase.from("weekly_menu_items").insert(itemRows);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/menu");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function regenerateDayAction(
  menuId: string,
  dayIndex: number,
): Promise<ActionResult> {
  if (dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "Día inválido." };
  }

  try {
    const supabase = await createClient();

    // Carga el estado actual del menú
    const { data: items } = await supabase
      .from("weekly_menu_items")
      .select(
        `day_of_week, recipe_id,
         recipe:recipes (
           id,
           main_ingredient:ingredients!recipes_main_ingredient_id_fkey
             (normalized_name, category)
         )`,
      )
      .eq("menu_id", menuId)
      .order("day_of_week", { ascending: true });

    const currentMenu: MenuCandidate[] = (items ?? []).map((it) => {
      const r = (it as unknown as {
        recipe: { id: string; main_ingredient: { normalized_name: string; category: string } | null };
      }).recipe;
      return {
        id: r.id,
        main_ingredient_normalized: r.main_ingredient?.normalized_name ?? null,
        main_ingredient_category:
          (r.main_ingredient?.category as MenuCandidate["main_ingredient_category"]) ?? null,
      };
    });

    const currentRecipeId =
      (items ?? []).find((it) => (it as { day_of_week: number }).day_of_week === dayIndex)?.recipe_id;

    const candidates = await fetchCandidatesForMenu();
    if (candidates.length === 0) {
      return { ok: false, error: "No hay recetas disponibles." };
    }

    const month = new Date().getMonth() + 1;
    const seasonal = await fetchSeasonalNamesForMonth(month);

    const replacement = pickReplacementForDay({
      recipes: candidates,
      currentMenu,
      dayIndex,
      seasonalNormalizedNames: seasonal,
      excludeRecipeId: currentRecipeId ?? undefined,
    });

    if (!replacement) {
      return { ok: false, error: "No hay recetas alternativas disponibles." };
    }

    const { error } = await supabase
      .from("weekly_menu_items")
      .update({ recipe_id: replacement.id })
      .eq("menu_id", menuId)
      .eq("day_of_week", dayIndex);
    if (error) throw new Error(error.message);

    revalidatePath("/menu");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function setMenuServingsAction(
  menuId: string,
  servings: number,
): Promise<ActionResult> {
  if (!Number.isFinite(servings) || servings < 1 || servings > 20) {
    return { ok: false, error: "Comensales debe estar entre 1 y 20." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_menus")
    .update({ servings: Math.round(servings) })
    .eq("id", menuId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/menu");
  revalidatePath("/compra");
  return { ok: true };
}

export async function deleteMenuAction(menuId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_menus").delete().eq("id", menuId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/menu");
  return { ok: true };
}
