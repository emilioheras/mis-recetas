import { createClient } from "@/lib/supabase/server";
import type { IngredientCategory, Unit } from "@/lib/ingredients";

export type ShoppingListItem = {
  id: string;
  ingredient_id: string;
  total_quantity: number | null;
  unit: Unit;
  checked: boolean;
  notes: string | null;
  ingredient: {
    id: string;
    name: string;
    category: IngredientCategory;
    is_pantry: boolean;
  };
};

export type ShoppingList = {
  id: string;
  generated_at: string;
  items: ShoppingListItem[];
};

export async function getShoppingListByMenuId(
  menuId: string,
): Promise<ShoppingList | null> {
  const supabase = await createClient();
  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select("id, generated_at")
    .eq("menu_id", menuId)
    .maybeSingle();
  if (error) throw error;
  if (!list) return null;

  const { data: items } = await supabase
    .from("shopping_list_items")
    .select(
      `id, ingredient_id, total_quantity, unit, checked, notes,
       ingredient:ingredients (id, name, category, is_pantry)`,
    )
    .eq("list_id", list.id);

  return {
    id: list.id,
    generated_at: list.generated_at,
    items: (items ?? []) as unknown as ShoppingListItem[],
  };
}
