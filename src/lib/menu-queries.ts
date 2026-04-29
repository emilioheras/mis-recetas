import { createClient } from "@/lib/supabase/server";
import type { IngredientCategory } from "@/lib/ingredients";
import type { MenuCandidate } from "@/lib/menu-generator";

export type WeeklyMenuRow = {
  id: string;
  week_start_date: string; // ISO date
  servings: number;
};

export type WeeklyMenuItemRow = {
  id: string;
  day_of_week: number; // 0..6, 0=lunes
  recipe_id: string;
  recipe: {
    id: string;
    title: string;
    servings: number;
    main_ingredient_id: string | null;
    main_ingredient: {
      id: string;
      name: string;
      normalized_name: string;
      category: IngredientCategory;
    } | null;
  };
};

export async function getMenuByWeekStart(weekStartDate: string): Promise<{
  menu: WeeklyMenuRow;
  items: WeeklyMenuItemRow[];
} | null> {
  const supabase = await createClient();
  const { data: menu, error } = await supabase
    .from("weekly_menus")
    .select("id, week_start_date, servings")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) throw error;
  if (!menu) return null;

  const { data: items } = await supabase
    .from("weekly_menu_items")
    .select(
      `id, day_of_week, recipe_id,
       recipe:recipes (
         id, title, servings, main_ingredient_id,
         main_ingredient:ingredients!recipes_main_ingredient_id_fkey
           (id, name, normalized_name, category)
       )`,
    )
    .eq("menu_id", menu.id)
    .order("day_of_week", { ascending: true });

  return {
    menu,
    items: (items ?? []) as unknown as WeeklyMenuItemRow[],
  };
}

export async function fetchCandidatesForMenu(): Promise<MenuCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id,
       main_ingredient:ingredients!recipes_main_ingredient_id_fkey
         (normalized_name, category)`,
    );
  if (error) throw error;

  return (data ?? []).map((r) => {
    const mi = (r as unknown as {
      main_ingredient: { normalized_name: string; category: IngredientCategory } | null;
    }).main_ingredient;
    return {
      id: (r as { id: string }).id,
      main_ingredient_normalized: mi?.normalized_name ?? null,
      main_ingredient_category: mi?.category ?? null,
    };
  });
}

export async function fetchSeasonalNamesForMonth(month: number): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_reference")
    .select("normalized_name")
    .eq("month", month);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.normalized_name));
}
