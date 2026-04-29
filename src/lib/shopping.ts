import type { IngredientCategory, Unit } from "@/lib/ingredients";

export type ShoppingInputItem = {
  ingredient_id: string;
  ingredient_name: string;
  ingredient_category: IngredientCategory;
  quantity: number | null;
  unit: Unit;
};

export type ShoppingInputRecipe = {
  servings: number;
  ingredients: ShoppingInputItem[];
};

export type AggregatedShoppingItem = {
  ingredient_id: string;
  name: string;
  category: IngredientCategory;
  total_quantity: number | null;
  unit: Unit;
};

/**
 * Agrega los ingredientes de las recetas del menú semanal escalando por
 * comensales y consolidando por (ingredient_id, unit).
 *
 * No se hacen conversiones entre unidades distintas en v1: si una receta pide
 * "200 g tomate" y otra "2 ud tomate", aparecen como dos líneas separadas.
 */
export function aggregateShoppingItems(
  menuServings: number,
  recipes: ShoppingInputRecipe[],
): AggregatedShoppingItem[] {
  const map = new Map<string, AggregatedShoppingItem>();

  for (const recipe of recipes) {
    const factor =
      recipe.servings > 0 ? menuServings / recipe.servings : 1;

    for (const ing of recipe.ingredients) {
      const key = `${ing.ingredient_id}:${ing.unit}`;
      const scaled =
        ing.quantity != null && Number.isFinite(ing.quantity)
          ? round2(ing.quantity * factor)
          : null;

      const existing = map.get(key);
      if (existing) {
        if (scaled != null) {
          existing.total_quantity =
            existing.total_quantity == null
              ? scaled
              : round2(existing.total_quantity + scaled);
        }
      } else {
        map.set(key, {
          ingredient_id: ing.ingredient_id,
          name: ing.ingredient_name,
          category: ing.ingredient_category,
          total_quantity: scaled,
          unit: ing.unit,
        });
      }
    }
  }

  return Array.from(map.values());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const CATEGORY_ORDER: IngredientCategory[] = [
  "verdura",
  "fruta",
  "pescado",
  "carne",
  "huevo",
  "lacteo",
  "legumbre",
  "cereal",
  "condimento",
  "bebida",
  "otro",
];

export const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  verdura: "Verdura y hortalizas",
  fruta: "Fruta",
  pescado: "Pescadería",
  carne: "Carnicería",
  huevo: "Huevos",
  lacteo: "Lácteos",
  legumbre: "Legumbres",
  cereal: "Cereales y pasta",
  condimento: "Condimentos y especias",
  bebida: "Bebidas",
  otro: "Otros",
};
