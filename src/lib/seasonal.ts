import { Sprout, Sun, Leaf, Snowflake } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SeasonCategory = "verdura" | "fruta" | "pescado";
export type SeasonKey = "primavera" | "verano" | "otono" | "invierno";

type ProductInfo = {
  name: string;
  category: SeasonCategory;
};

// Catálogo paralelo a la tabla `seasonal_reference`. La clave coincide con
// `normalized_name` del SQL (minúsculas, sin tildes). Si se añade un
// producto a la migración, añadirlo aquí también.
export const PRODUCT_CATALOG: Record<string, ProductInfo> = {
  // Verduras
  "acelga": { name: "Acelga", category: "verdura" },
  "ajo tierno": { name: "Ajo tierno", category: "verdura" },
  "alcachofa": { name: "Alcachofa", category: "verdura" },
  "berenjena": { name: "Berenjena", category: "verdura" },
  "boniato": { name: "Boniato", category: "verdura" },
  "brocoli": { name: "Brócoli", category: "verdura" },
  "calabacin": { name: "Calabacín", category: "verdura" },
  "calabaza": { name: "Calabaza", category: "verdura" },
  "cardo": { name: "Cardo", category: "verdura" },
  "coliflor": { name: "Coliflor", category: "verdura" },
  "endivia": { name: "Endivia", category: "verdura" },
  "escarola": { name: "Escarola", category: "verdura" },
  "esparrago": { name: "Espárrago", category: "verdura" },
  "espinaca": { name: "Espinaca", category: "verdura" },
  "guisante": { name: "Guisante", category: "verdura" },
  "haba": { name: "Haba", category: "verdura" },
  "judia verde": { name: "Judía verde", category: "verdura" },
  "lechuga": { name: "Lechuga", category: "verdura" },
  "pepino": { name: "Pepino", category: "verdura" },
  "pimiento": { name: "Pimiento", category: "verdura" },
  "puerro": { name: "Puerro", category: "verdura" },
  "rabano": { name: "Rábano", category: "verdura" },
  "remolacha": { name: "Remolacha", category: "verdura" },
  "repollo": { name: "Repollo", category: "verdura" },
  "tomate": { name: "Tomate", category: "verdura" },
  "zanahoria": { name: "Zanahoria", category: "verdura" },

  // Frutas
  "aguacate": { name: "Aguacate", category: "fruta" },
  "albaricoque": { name: "Albaricoque", category: "fruta" },
  "caqui": { name: "Caqui", category: "fruta" },
  "castana": { name: "Castaña", category: "fruta" },
  "cereza": { name: "Cereza", category: "fruta" },
  "ciruela": { name: "Ciruela", category: "fruta" },
  "fresa": { name: "Fresa", category: "fruta" },
  "granada": { name: "Granada", category: "fruta" },
  "higo": { name: "Higo", category: "fruta" },
  "kiwi": { name: "Kiwi", category: "fruta" },
  "limon": { name: "Limón", category: "fruta" },
  "mandarina": { name: "Mandarina", category: "fruta" },
  "manzana": { name: "Manzana", category: "fruta" },
  "melocoton": { name: "Melocotón", category: "fruta" },
  "melon": { name: "Melón", category: "fruta" },
  "membrillo": { name: "Membrillo", category: "fruta" },
  "naranja": { name: "Naranja", category: "fruta" },
  "nectarina": { name: "Nectarina", category: "fruta" },
  "nispero": { name: "Níspero", category: "fruta" },
  "paraguayo": { name: "Paraguayo", category: "fruta" },
  "pera": { name: "Pera", category: "fruta" },
  "pomelo": { name: "Pomelo", category: "fruta" },
  "sandia": { name: "Sandía", category: "fruta" },
  "uva": { name: "Uva", category: "fruta" },

  // Pescados y mariscos
  "anchoa": { name: "Anchoa", category: "pescado" },
  "boqueron": { name: "Boquerón", category: "pescado" },
  "atun": { name: "Atún", category: "pescado" },
  "bonito": { name: "Bonito", category: "pescado" },
  "caballa": { name: "Caballa", category: "pescado" },
  "sardina": { name: "Sardina", category: "pescado" },
  "besugo": { name: "Besugo", category: "pescado" },
  "mejillon": { name: "Mejillón", category: "pescado" },
};

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

export function getMonthName(month: number): string {
  return MONTH_NAMES[(month - 1) % 12];
}

type SeasonInfo = {
  key: SeasonKey;
  label: string;
  icon: LucideIcon;
};

export function getSeason(month: number): SeasonInfo {
  if (month >= 3 && month <= 5) {
    return { key: "primavera", label: "Primavera", icon: Sprout };
  }
  if (month >= 6 && month <= 8) {
    return { key: "verano", label: "Verano", icon: Sun };
  }
  if (month >= 9 && month <= 11) {
    return { key: "otono", label: "Otoño", icon: Leaf };
  }
  return { key: "invierno", label: "Invierno", icon: Snowflake };
}
