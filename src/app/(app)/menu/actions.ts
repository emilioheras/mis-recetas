"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";
import {
  fetchCandidatesForMenu,
  fetchSeasonalNamesForMonth,
} from "@/lib/menu-queries";
import {
  pickReplacementForDay,
  type MenuCandidate,
} from "@/lib/menu-generator";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function getDefaultHouseholdServings(): Promise<number> {
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

// Devuelve el menú de la semana indicada, creándolo si no existe.
async function getOrCreateMenuForWeek(
  weekStart: string,
): Promise<{ id: string; servings: number }> {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();

  const { data: existing } = await supabase
    .from("weekly_menus")
    .select("id, servings")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  if (existing) return existing;

  const servings = await getDefaultHouseholdServings();
  const { data: created, error } = await supabase
    .from("weekly_menus")
    .insert({
      household_id: householdId,
      week_start_date: weekStart,
      servings,
    })
    .select("id, servings")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "No se pudo crear el menú");
  }
  return created;
}

export async function assignRecipeToDayAction(
  weekStart: string,
  dayIndex: number,
  recipeId: string,
): Promise<ActionResult> {
  if (dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "Día inválido." };
  }
  try {
    const supabase = await createClient();
    const menu = await getOrCreateMenuForWeek(weekStart);

    // Borra cualquier item previo de ese día (defensivo, sirve también
    // para "Elegir otra" que reemplaza la asignación).
    await supabase
      .from("weekly_menu_items")
      .delete()
      .eq("menu_id", menu.id)
      .eq("day_of_week", dayIndex)
      .eq("meal", "comida");

    const { error } = await supabase.from("weekly_menu_items").insert({
      menu_id: menu.id,
      recipe_id: recipeId,
      day_of_week: dayIndex,
      meal: "comida",
    });
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

export async function unassignDayAction(
  menuId: string,
  dayIndex: number,
): Promise<ActionResult> {
  if (dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "Día inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_menu_items")
    .delete()
    .eq("menu_id", menuId)
    .eq("day_of_week", dayIndex)
    .eq("meal", "comida");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/menu");
  return { ok: true };
}

export async function clearMenuAction(menuId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_menu_items")
    .delete()
    .eq("menu_id", menuId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/menu");
  return { ok: true };
}

export async function fillEmptyDaysAction(
  weekStart: string,
): Promise<ActionResult> {
  try {
    const candidates = await fetchCandidatesForMenu();
    if (candidates.length === 0) {
      return {
        ok: false,
        error: "Necesitas al menos una receta guardada.",
      };
    }

    const supabase = await createClient();
    const menu = await getOrCreateMenuForWeek(weekStart);

    // Estado actual de los días.
    const { data: existingItems } = await supabase
      .from("weekly_menu_items")
      .select(
        `day_of_week, recipe_id,
         recipe:recipes (
           id,
           main_ingredient:ingredients!recipes_main_ingredient_id_fkey
             (normalized_name, category)
         )`,
      )
      .eq("menu_id", menu.id);

    const assigned = new Map<number, MenuCandidate>();
    for (const it of existingItems ?? []) {
      const r = (it as unknown as {
        day_of_week: number;
        recipe: {
          id: string;
          main_ingredient: { normalized_name: string; category: string } | null;
        };
      });
      assigned.set(r.day_of_week, {
        id: r.recipe.id,
        main_ingredient_normalized: r.recipe.main_ingredient?.normalized_name ?? null,
        main_ingredient_category:
          (r.recipe.main_ingredient?.category as MenuCandidate["main_ingredient_category"]) ??
          null,
      });
    }

    const month = new Date().getMonth() + 1;
    const seasonal = await fetchSeasonalNamesForMonth(month);

    // Para cada día vacío, escoge una receta penalizando vecinos.
    const newRows: Array<{
      menu_id: string;
      recipe_id: string;
      day_of_week: number;
      meal: "comida";
    }> = [];
    for (let day = 0; day < 7; day++) {
      if (assigned.has(day)) continue;
      const currentMenu: MenuCandidate[] = [];
      for (let d = 0; d < 7; d++) {
        const item = assigned.get(d);
        if (item) currentMenu.push(item);
      }
      const replacement = pickReplacementForDay({
        recipes: candidates,
        currentMenu,
        dayIndex: day,
        seasonalNormalizedNames: seasonal,
      });
      if (!replacement) continue;
      assigned.set(day, replacement);
      newRows.push({
        menu_id: menu.id,
        recipe_id: replacement.id,
        day_of_week: day,
        meal: "comida",
      });
    }

    if (newRows.length > 0) {
      const { error } = await supabase.from("weekly_menu_items").insert(newRows);
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
  weekStart: string,
  dayIndex: number,
): Promise<ActionResult> {
  if (dayIndex < 0 || dayIndex > 6) {
    return { ok: false, error: "Día inválido." };
  }

  try {
    const candidates = await fetchCandidatesForMenu();
    if (candidates.length === 0) {
      return { ok: false, error: "No hay recetas disponibles." };
    }

    const supabase = await createClient();
    const menu = await getOrCreateMenuForWeek(weekStart);

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
      .eq("menu_id", menu.id)
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

    if (currentRecipeId) {
      const { error } = await supabase
        .from("weekly_menu_items")
        .update({ recipe_id: replacement.id })
        .eq("menu_id", menu.id)
        .eq("day_of_week", dayIndex)
        .eq("meal", "comida");
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("weekly_menu_items").insert({
        menu_id: menu.id,
        recipe_id: replacement.id,
        day_of_week: dayIndex,
        meal: "comida",
      });
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
