export function normalizeIngredient(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/s$/, "")
    .replace(/\s+/g, " ");
}

export const INGREDIENT_CATEGORIES = [
  { value: "verdura", label: "Verdura" },
  { value: "fruta", label: "Fruta" },
  { value: "pescado", label: "Pescado" },
  { value: "carne", label: "Carne" },
  { value: "lacteo", label: "Lácteo" },
  { value: "cereal", label: "Cereal / pasta" },
  { value: "legumbre", label: "Legumbre" },
  { value: "huevo", label: "Huevo" },
  { value: "condimento", label: "Condimento / especia" },
  { value: "bebida", label: "Bebida" },
  { value: "otro", label: "Otro" },
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]["value"];

export const UNITS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "ud", label: "unidad" },
  { value: "cdta", label: "cdta" },
  { value: "cda", label: "cda" },
  { value: "taza", label: "taza" },
  { value: "pizca", label: "pizca" },
  { value: "al_gusto", label: "al gusto" },
] as const;

export type Unit = (typeof UNITS)[number]["value"];
