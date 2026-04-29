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
  main_ingredient_name: string;
  main_ingredient_category: IngredientCategory;
  ingredients: IngredientFormRow[];
  source_type: SourceType;
  source_url: string | null;
  video_url: string | null;
  pdf_url: string | null;
};

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

  const main_ingredient_name = String(formData.get("main_ingredient_name") ?? "").trim();
  if (!main_ingredient_name) {
    return { error: "Indica el ingrediente principal." };
  }
  const main_ingredient_category = (formData.get("main_ingredient_category") ?? "otro") as IngredientCategory;

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
        notes: String(row.notes ?? "").trim(),
      }));
  } catch {
    return { error: "Lista de ingredientes inválida." };
  }

  const rawSourceType = String(formData.get("source_type") ?? "manual");
  const source_type = (VALID_SOURCE_TYPES as string[]).includes(rawSourceType)
    ? (rawSourceType as SourceType)
    : "manual";
  const source_url = (String(formData.get("source_url") ?? "").trim() || null);
  const video_url = (String(formData.get("video_url") ?? "").trim() || null);
  const pdf_url = (String(formData.get("pdf_url") ?? "").trim() || null);

  return {
    title,
    servings: Math.round(servings),
    prep_minutes: prep_minutes === null ? null : Math.round(prep_minutes),
    instructions_md,
    notes,
    main_ingredient_name,
    main_ingredient_category,
    ingredients,
    source_type,
    source_url,
    video_url,
    pdf_url,
  };
}

async function findOrCreateIngredient(
  name: string,
  category: IngredientCategory,
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

  if (existing) return existing.id;

  const { data: viaAlias } = await supabase
    .from("ingredient_aliases")
    .select("ingredient_id")
    .eq("alias", normalized)
    .maybeSingle();
  if (viaAlias) return viaAlias.ingredient_id;

  const { data: created, error } = await supabase
    .from("ingredients")
    .insert({
      name: name.trim(),
      normalized_name: normalized,
      category,
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

    const mainIngredientId = await findOrCreateIngredient(
      parsed.main_ingredient_name,
      parsed.main_ingredient_category,
      householdId,
    );

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
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "No se pudo crear la receta");
      id = data.id;
    }

    const rowsToInsert: Array<{
      recipe_id: string;
      ingredient_id: string;
      quantity: number | null;
      unit: Unit;
      is_main: boolean;
      notes: string | null;
      position: number;
    }> = [];

    rowsToInsert.push({
      recipe_id: id,
      ingredient_id: mainIngredientId,
      quantity: null,
      unit: "al_gusto",
      is_main: true,
      notes: null,
      position: 0,
    });

    for (let i = 0; i < parsed.ingredients.length; i++) {
      const row = parsed.ingredients[i];
      const ingredientId = await findOrCreateIngredient(row.name, "otro", householdId);
      if (ingredientId === mainIngredientId) continue;
      const qty = row.quantity === "" ? null : Number(row.quantity);
      rowsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: Number.isFinite(qty) ? (qty as number) : null,
        unit: row.unit,
        is_main: false,
        notes: row.notes || null,
        position: i + 1,
      });
    }

    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from("recipe_ingredients").insert(rowsToInsert);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/recetas");
    revalidatePath(`/recetas/${id}`);

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
  redirect("/recetas");
}
