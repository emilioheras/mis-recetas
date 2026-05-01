"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/recipes/queries";
import {
  normalizeIngredient,
  type IngredientCategory,
} from "@/lib/ingredients";

const VALID_CATEGORIES: IngredientCategory[] = [
  "verdura", "fruta", "pescado", "carne", "lacteo", "cereal",
  "legumbre", "huevo", "condimento", "bebida", "otro",
];

export async function togglePantryAction(
  ingredientId: string,
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredients")
    .update({ is_pantry: value })
    .eq("id", ingredientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/despensa");
  revalidatePath("/compra");
  return { ok: true };
}

export async function deleteIngredientAction(
  ingredientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Comprobación defensiva: solo permitimos borrar ingredientes que NO
  // estén usados en ninguna receta. La UI ya esconde el botón en ese
  // caso, pero por si acaso (ediciones concurrentes, etc.).
  const { count, error: countError } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id", { count: "exact", head: true })
    .eq("ingredient_id", ingredientId);

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este ingrediente todavía está en alguna receta. Quítalo de las recetas antes de borrarlo.",
    };
  }

  // shopping_list_items tiene ON DELETE RESTRICT sobre ingredients,
  // así que si el ingrediente apareció en alguna lista de la compra
  // antigua hay que limpiarlo primero para que el delete no falle.
  await supabase
    .from("shopping_list_items")
    .delete()
    .eq("ingredient_id", ingredientId);

  const { error } = await supabase.from("ingredients").delete().eq("id", ingredientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/despensa");
  revalidatePath("/compra");
  return { ok: true };
}

export async function addPantryIngredientAction(
  rawName: string,
  rawCategory: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = rawName.trim();
  if (!name) return { ok: false, error: "El nombre no puede estar vacío." };

  const category = (VALID_CATEGORIES as string[]).includes(rawCategory)
    ? (rawCategory as IngredientCategory)
    : "otro";

  try {
    const householdId = await getCurrentHouseholdId();
    const supabase = await createClient();
    const normalized = normalizeIngredient(name);

    const { data: existing } = await supabase
      .from("ingredients")
      .select("id")
      .eq("household_id", householdId)
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("ingredients")
        .update({ is_pantry: true })
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("ingredients").insert({
        household_id: householdId,
        name,
        normalized_name: normalized,
        category,
        is_pantry: true,
      });
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/despensa");
    revalidatePath("/compra");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
