"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateShoppingItems,
  type ShoppingInputRecipe,
} from "@/lib/shopping";
import type { IngredientCategory, Unit } from "@/lib/ingredients";

type ActionResult = { ok: true } | { ok: false; error: string };

type RawMenuItem = {
  recipe: {
    id: string;
    servings: number;
    recipe_ingredients: Array<{
      ingredient_id: string;
      quantity: number | null;
      unit: Unit;
      ingredient: {
        id: string;
        name: string;
        category: IngredientCategory;
      };
    }>;
  };
};

export async function generateShoppingListAction(
  menuId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: menu, error: menuErr } = await supabase
      .from("weekly_menus")
      .select("id, servings")
      .eq("id", menuId)
      .maybeSingle();
    if (menuErr) throw menuErr;
    if (!menu) return { ok: false, error: "Menú no encontrado." };

    const { data: items, error: itemsErr } = await supabase
      .from("weekly_menu_items")
      .select(
        `recipe:recipes (
          id, servings,
          recipe_ingredients (
            ingredient_id, quantity, unit,
            ingredient:ingredients (id, name, category)
          )
        )`,
      )
      .eq("menu_id", menuId);
    if (itemsErr) throw itemsErr;

    const recipes: ShoppingInputRecipe[] = ((items ?? []) as unknown as RawMenuItem[]).map(
      (it) => ({
        servings: it.recipe.servings,
        ingredients: (it.recipe.recipe_ingredients ?? []).map((ri) => ({
          ingredient_id: ri.ingredient_id,
          ingredient_name: ri.ingredient.name,
          ingredient_category: ri.ingredient.category,
          quantity: ri.quantity,
          unit: ri.unit,
        })),
      }),
    );

    const aggregated = aggregateShoppingItems(menu.servings, recipes);

    // Borra lista anterior (cascade borra items)
    await supabase.from("shopping_lists").delete().eq("menu_id", menuId);

    const { data: list, error: createErr } = await supabase
      .from("shopping_lists")
      .insert({ menu_id: menuId })
      .select("id")
      .single();
    if (createErr || !list) throw new Error(createErr?.message ?? "Error creando lista");

    if (aggregated.length > 0) {
      const { error } = await supabase.from("shopping_list_items").insert(
        aggregated.map((a) => ({
          list_id: list.id,
          ingredient_id: a.ingredient_id,
          total_quantity: a.total_quantity,
          unit: a.unit,
        })),
      );
      if (error) throw error;
    }

    revalidatePath("/compra");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function toggleShoppingItemAction(
  itemId: string,
  checked: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/compra");
  return { ok: true };
}

export async function deleteShoppingListAction(
  listId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").delete().eq("id", listId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/compra");
  return { ok: true };
}
