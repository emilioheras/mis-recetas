import { createClient } from "@/lib/supabase/server";
import type { Category, Recipe, RecipeListItem } from "./types";
import { PRODUCT_CATALOG, type SeasonCategory } from "@/lib/seasonal";

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

export type SeasonalProduct = {
  normalized: string;
  name: string;
  peak: boolean;
};

export type SeasonalRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  prep_minutes: number | null;
  servings: number;
  main_ingredient: { id: string; name: string; normalized_name: string } | null;
  isPeak: boolean;
};

export type SeasonalDashboard = {
  month: number;
  totalRecipes: number;
  products: Record<SeasonCategory, SeasonalProduct[]>;
  recipes: SeasonalRecipe[];
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

function rotateForToday<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items;
  const k = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

export async function getSeasonalDashboard(
  recipeLimit = 4,
): Promise<SeasonalDashboard> {
  const supabase = await createClient();
  const month = new Date().getMonth() + 1;

  const [{ data: recipesRaw }, { data: seasonal }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        `id, title, image_url, prep_minutes, servings,
         main_ingredient:ingredients!recipes_main_ingredient_id_fkey
           (id, name, normalized_name)`,
      )
      .order("id", { ascending: true }),
    supabase
      .from("seasonal_reference")
      .select("normalized_name, peak")
      .eq("month", month),
  ]);

  const seasonalMap = new Map<string, boolean>();
  for (const row of seasonal ?? []) {
    seasonalMap.set(row.normalized_name, row.peak);
  }

  const products: Record<SeasonCategory, SeasonalProduct[]> = {
    verdura: [],
    fruta: [],
    pescado: [],
  };
  for (const [normalized, peak] of seasonalMap) {
    const meta = PRODUCT_CATALOG[normalized];
    if (!meta) continue;
    products[meta.category].push({ normalized, name: meta.name, peak });
  }
  for (const cat of Object.keys(products) as SeasonCategory[]) {
    products[cat].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  type RawRecipe = {
    id: string;
    title: string;
    image_url: string | null;
    prep_minutes: number | null;
    servings: number;
    main_ingredient: {
      id: string;
      name: string;
      normalized_name: string;
    } | null;
  };
  const allRecipes = (recipesRaw ?? []) as unknown as RawRecipe[];

  const peakPool: SeasonalRecipe[] = [];
  const inSeasonPool: SeasonalRecipe[] = [];
  for (const r of allRecipes) {
    const norm = r.main_ingredient?.normalized_name;
    const peak = norm ? seasonalMap.get(norm) : undefined;
    if (peak === undefined) continue;
    const item: SeasonalRecipe = {
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      prep_minutes: r.prep_minutes,
      servings: r.servings,
      main_ingredient: r.main_ingredient,
      isPeak: peak === true,
    };
    if (peak === true) peakPool.push(item);
    else inSeasonPool.push(item);
  }

  const offset = dayOfYear();
  const rotatedPeak = rotateForToday(peakPool, offset);
  const rotatedInSeason = rotateForToday(inSeasonPool, offset);
  const recipes = [...rotatedPeak, ...rotatedInSeason].slice(0, recipeLimit);

  return {
    month,
    totalRecipes: allRecipes.length,
    products,
    recipes,
  };
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

export type CategoryWithCount = Category & { recipe_count: number };

export async function listCategoriesWithRecipeCount(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();

  const [catsRes, linksRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, normalized_name")
      .order("name", { ascending: true }),
    supabase.from("recipe_categories").select("category_id"),
  ]);

  if (catsRes.error) throw catsRes.error;
  if (linksRes.error) throw linksRes.error;

  const counts = new Map<string, number>();
  for (const row of linksRes.data ?? []) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (catsRes.data ?? []).map((c) => ({
    ...(c as Category),
    recipe_count: counts.get(c.id) ?? 0,
  }));
}

export type PantryIngredient = {
  id: string;
  name: string;
  category: import("@/lib/ingredients").IngredientCategory;
  is_pantry: boolean;
  recipe_count: number;
};

export async function listIngredientsWithRecipeCount(): Promise<PantryIngredient[]> {
  const supabase = await createClient();

  const [ingredientsRes, recipeIngsRes] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id, name, category, is_pantry")
      .order("name", { ascending: true }),
    supabase
      .from("recipe_ingredients")
      .select("ingredient_id, recipe_id"),
  ]);

  if (ingredientsRes.error) throw ingredientsRes.error;
  if (recipeIngsRes.error) throw recipeIngsRes.error;

  // Cuenta recetas DISTINTAS (recipe_id) por ingredient_id, no filas:
  // si una receta tuviera el mismo ingrediente en dos unidades distintas,
  // queremos contarla una sola vez.
  const recipesPerIngredient = new Map<string, Set<string>>();
  for (const r of recipeIngsRes.data ?? []) {
    const set = recipesPerIngredient.get(r.ingredient_id);
    if (set) set.add(r.recipe_id);
    else recipesPerIngredient.set(r.ingredient_id, new Set([r.recipe_id]));
  }

  return (ingredientsRes.data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    is_pantry: i.is_pantry,
    recipe_count: recipesPerIngredient.get(i.id)?.size ?? 0,
  }));
}
