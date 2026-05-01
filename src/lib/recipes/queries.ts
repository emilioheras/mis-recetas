import { createClient } from "@/lib/supabase/server";
import type { Category, Recipe, RecipeListItem } from "./types";

type RecipeCategoryJoin = {
  position: number | null;
  category: Category | null;
};

function flattenCategories(rows: RecipeCategoryJoin[] | null | undefined): Category[] {
  if (!rows) return [];
  return rows
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((r) => r.category)
    .filter((c): c is Category => c !== null);
}

export type RecipeOfTheDay = {
  recipe: RecipeListItem;
  seasonality: "peak" | "in_season" | "off_season";
};

function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export async function getCurrentHouseholdId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      "Tu usuario no está asociado a un hogar. Añade tu email a allowed_emails y vuelve a iniciar sesión.",
    );
  }
  return data.household_id;
}

export async function listRecipes(search?: string): Promise<RecipeListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("recipes")
    .select(
      `id, title, source_type, prep_minutes, servings,
       main_ingredient:ingredients!recipes_main_ingredient_id_fkey
         (id, name, normalized_name, category),
       category_links:recipe_categories (
         position,
         category:categories (id, name, normalized_name)
       )`,
    )
    .order("title", { ascending: true });

  if (search && search.trim().length > 0) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as RecipeListItem & { category_links?: RecipeCategoryJoin[] };
    return {
      id: r.id,
      title: r.title,
      source_type: r.source_type,
      prep_minutes: r.prep_minutes,
      servings: r.servings,
      main_ingredient: r.main_ingredient,
      categories: flattenCategories(r.category_links),
    };
  });
}

export async function getRecipeOfTheDay(): Promise<RecipeOfTheDay | null> {
  const supabase = await createClient();
  const month = new Date().getMonth() + 1;

  const [{ data: recipesRaw }, { data: seasonal }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        `id, title, source_type, prep_minutes, servings,
         main_ingredient:ingredients!recipes_main_ingredient_id_fkey
           (id, name, normalized_name, category),
         category_links:recipe_categories (
           position,
           category:categories (id, name, normalized_name)
         )`,
      )
      .order("id", { ascending: true }),
    supabase
      .from("seasonal_reference")
      .select("normalized_name, peak")
      .eq("month", month),
  ]);

  if (!recipesRaw || recipesRaw.length === 0) return null;

  const recipes: RecipeListItem[] = recipesRaw.map((row) => {
    const r = row as unknown as RecipeListItem & { category_links?: RecipeCategoryJoin[] };
    return {
      id: r.id,
      title: r.title,
      source_type: r.source_type,
      prep_minutes: r.prep_minutes,
      servings: r.servings,
      main_ingredient: r.main_ingredient,
      categories: flattenCategories(r.category_links),
    };
  });

  const seasonalMap = new Map<string, boolean>();
  for (const row of seasonal ?? []) {
    seasonalMap.set(row.normalized_name, row.peak);
  }

  const peakPool: RecipeListItem[] = [];
  const inSeasonPool: RecipeListItem[] = [];
  const offPool: RecipeListItem[] = [];

  for (const r of recipes) {
    const norm = r.main_ingredient?.normalized_name;
    const peak = norm ? seasonalMap.get(norm) : undefined;
    if (peak === true) peakPool.push(r);
    else if (peak === false) inSeasonPool.push(r);
    else offPool.push(r);
  }

  const index = dayOfYear();
  if (peakPool.length > 0) {
    return { recipe: peakPool[index % peakPool.length], seasonality: "peak" };
  }
  if (inSeasonPool.length > 0) {
    return { recipe: inSeasonPool[index % inSeasonPool.length], seasonality: "in_season" };
  }
  return { recipe: offPool[index % offPool.length], seasonality: "off_season" };
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, title, source_type, source_url, video_url, pdf_url, image_url, servings,
       prep_minutes, instructions_md, notes, created_at,
       main_ingredient:ingredients!recipes_main_ingredient_id_fkey (id, name, normalized_name, category, is_pantry),
       ingredients:recipe_ingredients (
         id, ingredient_id, quantity, unit, is_main, notes, position,
         ingredient:ingredients (id, name, normalized_name, category, is_pantry)
       ),
       category_links:recipe_categories (
         position,
         category:categories (id, name, normalized_name)
       )`,
    )
    .eq("id", id)
    .order("position", { foreignTable: "recipe_ingredients", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const r = data as unknown as Recipe & { category_links?: RecipeCategoryJoin[] };
  return {
    ...r,
    categories: flattenCategories(r.category_links),
  };
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, normalized_name")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}
