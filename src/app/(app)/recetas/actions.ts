"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";
import { normalizeIngredient, type IngredientCategory, type Unit } from "@/lib/ingredients";
import type { IngredientFormRow, SourceType } from "@/lib/recipes/types";

type ActionResult = { ok: true; recipeId: string } | { ok: false; error: string };

const VALID_SOURCE_TYPES: SourceType[] = ["manual", "url", "markdown", "youtube", "pdf"];

type RawPayload = {
  title: string;
  servings: number;
  prep_minutes: number | null;
  instructions_md: string;
  notes: string;
  ingredients: IngredientFormRow[];
  categories: string[];
  source_type: SourceType;
  source_url: string | null;
  video_url: string | null;
  pdf_url: string | null;
  image_url: string | null;
};

function normalizeCategory(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const VALID_CATEGORIES: IngredientCategory[] = [
  "verdura", "fruta", "pescado", "carne", "lacteo", "cereal",
  "legumbre", "huevo", "condimento", "bebida", "otro",
];

function parsePayload(formData: FormData): RawPayload | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "El título es obligatorio." };

  const servings = Number(formData.get("servings") ?? 2);
  if (!Number.isFinite(servings) || servings < 1 || servings > 20) {
    return { error: "Comensales debe estar entre 1 y 20." };
  }

  const prepRaw = String(formData.get("prep_minutes") ?? "").trim();
  const prep_minutes = prepRaw === "" ? null : Number(prepRaw);
  if (prep_minutes !== null && (!Number.isFinite(prep_minutes) || prep_minutes < 0)) {
    return { error: "El tiempo de preparación no es válido." };
  }

  const instructions_md = String(formData.get("instructions_md") ?? "");
  const notes = String(formData.get("notes") ?? "");

  let ingredients: IngredientFormRow[] = [];
  try {
    const raw = String(formData.get("ingredients") ?? "[]");
    const parsed = JSON.parse(raw) as IngredientFormRow[];
    ingredients = parsed
      .filter((row) => row && typeof row.name === "string" && row.name.trim().length > 0)
      .map((row) => ({
        name: row.name.trim(),
        quantity: String(row.quantity ?? "").trim(),
        unit: (row.unit ?? "al_gusto") as Unit,
        category: VALID_CATEGORIES.includes(row.category as IngredientCategory)
          ? (row.category as IngredientCategory)
          : "otro",
        is_main: row.is_main === true,
        is_pantry: row.is_pantry === true,
        notes: String(row.notes ?? "").trim(),
      }));
  } catch {
    return { error: "Lista de ingredientes inválida." };
  }

  const mainCount = ingredients.filter((i) => i.is_main).length;
  if (mainCount === 0) {
    return { error: "Marca un ingrediente como principal con la estrella." };
  }
  if (mainCount > 1) {
    return { error: "Solo un ingrediente puede ser el principal." };
  }

  let categories: string[] = [];
  try {
    const raw = String(formData.get("categories") ?? "[]");
    const parsed = JSON.parse(raw) as unknown[];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const norm = normalizeCategory(trimmed);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      categories.push(trimmed);
    }
  } catch {
    return { error: "Lista de categorías inválida." };
  }

  const rawSourceType = String(formData.get("source_type") ?? "manual");
  const source_type = (VALID_SOURCE_TYPES as string[]).includes(rawSourceType)
    ? (rawSourceType as SourceType)
    : "manual";
  const source_url = (String(formData.get("source_url") ?? "").trim() || null);
  const video_url = (String(formData.get("video_url") ?? "").trim() || null);
  const pdf_url = (String(formData.get("pdf_url") ?? "").trim() || null);
  const image_url = (String(formData.get("image_url") ?? "").trim() || null);

  return {
    title,
    servings: Math.round(servings),
    prep_minutes: prep_minutes === null ? null : Math.round(prep_minutes),
    instructions_md,
    notes,
    ingredients,
    categories,
    source_type,
    source_url,
    video_url,
    pdf_url,
    image_url,
  };
}

async function findOrCreateCategory(
  name: string,
  householdId: string,
): Promise<string> {
  const supabase = await createClient();
  const normalized = normalizeCategory(name);

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("household_id", householdId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      normalized_name: normalized,
      household_id: householdId,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`No se pudo crear la categoría "${name}": ${error?.message ?? ""}`);
  }
  return created.id;
}

async function findOrCreateIngredient(
  name: string,
  category: IngredientCategory,
  isPantry: boolean,
  householdId: string,
): Promise<string> {
  const supabase = await createClient();
  const normalized = normalizeIngredient(name);

  const { data: existing } = await supabase
    .from("ingredients")
    .select("id")
    .eq("household_id", householdId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) {
    // Aplica el flag de despensa de esta edición a nivel global del
    // ingrediente (afecta a todas las recetas que lo usan).
    await supabase
      .from("ingredients")
      .update({ is_pantry: isPantry })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: viaAlias } = await supabase
    .from("ingredient_aliases")
    .select("ingredient_id")
    .eq("alias", normalized)
    .maybeSingle();
  if (viaAlias) {
    await supabase
      .from("ingredients")
      .update({ is_pantry: isPantry })
      .eq("id", viaAlias.ingredient_id);
    return viaAlias.ingredient_id;
  }

  const { data: created, error } = await supabase
    .from("ingredients")
    .insert({
      name: name.trim(),
      normalized_name: normalized,
      category,
      is_pantry: isPantry,
      household_id: householdId,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`No se pudo crear el ingrediente "${name}": ${error?.message ?? ""}`);
  }
  return created.id;
}

export async function saveRecipeAction(
  recipeId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parsePayload(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();

    const resolved: Array<{ row: IngredientFormRow; ingredient_id: string }> = [];
    for (const row of parsed.ingredients) {
      const ingredientId = await findOrCreateIngredient(
        row.name,
        row.category,
        row.is_pantry,
        householdId,
      );
      resolved.push({ row, ingredient_id: ingredientId });
    }

    const mainResolved = resolved.find((r) => r.row.is_main);
    if (!mainResolved) {
      return { ok: false, error: "Marca un ingrediente como principal con la estrella." };
    }
    const mainIngredientId = mainResolved.ingredient_id;

    let id: string;
    if (recipeId) {
      const { error } = await supabase
        .from("recipes")
        .update({
          title: parsed.title,
          servings: parsed.servings,
          prep_minutes: parsed.prep_minutes,
          instructions_md: parsed.instructions_md,
          notes: parsed.notes,
          main_ingredient_id: mainIngredientId,
          source_type: parsed.source_type,
          source_url: parsed.source_url,
          video_url: parsed.video_url,
          pdf_url: parsed.pdf_url,
          image_url: parsed.image_url,
        })
        .eq("id", recipeId);
      if (error) throw new Error(error.message);
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      id = recipeId;
    } else {
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          household_id: householdId,
          title: parsed.title,
          servings: parsed.servings,
          prep_minutes: parsed.prep_minutes,
          instructions_md: parsed.instructions_md,
          notes: parsed.notes,
          main_ingredient_id: mainIngredientId,
          source_type: parsed.source_type,
          source_url: parsed.source_url,
          video_url: parsed.video_url,
          pdf_url: parsed.pdf_url,
          image_url: parsed.image_url,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo crear la receta");
      id = data.id;
    }

    // Deduplica por ingredient_id+unit, manteniendo la primera aparición
    // (así si el usuario añade dos veces el mismo ingrediente en la misma unidad
    // no rompemos el unique index de la tabla).
    const seen = new Set<string>();
    const rowsToInsert: Array<{
      recipe_id: string;
      ingredient_id: string;
      quantity: number | null;
      unit: Unit;
      is_main: boolean;
      notes: string | null;
      position: number;
    }> = [];

    for (let i = 0; i < resolved.length; i++) {
      const { row, ingredient_id } = resolved[i];
      const key = `${ingredient_id}:${row.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const qty = row.quantity === "" ? null : Number(row.quantity);
      rowsToInsert.push({
        recipe_id: id,
        ingredient_id,
        quantity: Number.isFinite(qty) ? (qty as number) : null,
        unit: row.unit,
        is_main: row.is_main,
        notes: row.notes || null,
        position: i,
      });
    }

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from("recipe_ingredients").insert(rowsToInsert);
      if (error) throw new Error(error.message);
    }

    // Categorías: resolver/crear y reemplazar las asociaciones existentes.
    if (recipeId) {
      await supabase.from("recipe_categories").delete().eq("recipe_id", id);
    }
    if (parsed.categories.length > 0) {
      const categoryRows: Array<{
        recipe_id: string;
        category_id: string;
        position: number;
      }> = [];
      for (let i = 0; i < parsed.categories.length; i++) {
        const categoryId = await findOrCreateCategory(parsed.categories[i], householdId);
        categoryRows.push({ recipe_id: id, category_id: categoryId, position: i });
      }
      const { error } = await supabase.from("recipe_categories").insert(categoryRows);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/recetas");
    revalidatePath(`/recetas/${id}`);
    revalidatePath("/despensa");

    return { ok: true, recipeId: id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function deleteRecipeAction(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw new Error(error.message);
  revalidatePath("/recetas");
  revalidatePath("/despensa");
  redirect("/recetas");
}
