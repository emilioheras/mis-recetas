import Groq from "groq-sdk";
import type { RecipeDraft } from "@/lib/recipes/types";
import type { IngredientCategory, Unit } from "@/lib/ingredients";

const MODEL = "llama-3.3-70b-versatile";

function getClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "Falta GROQ_API_KEY en .env.local. Crea una clave gratuita en https://console.groq.com/keys y pégala en el archivo.",
    );
  }
  return new Groq({ apiKey: key });
}

const SYSTEM_PROMPT = `Eres un asistente que extrae recetas de cocina y las estructura en JSON.

Devuelve SIEMPRE un objeto JSON con EXACTAMENTE esta estructura (sin texto antes ni después):

{
  "title": "nombre del plato en español, ej. 'Tortilla de patatas'",
  "servings": número entero (2 si no se indica),
  "prep_minutes": número entero (o null si no se indica),
  "main_ingredient_name": "ingrediente principal en español, MINÚSCULAS, SIN TILDES, SINGULAR (ej: 'tomate', 'esparrago', 'garbanzo', 'pollo', 'merluza')",
  "main_ingredient_category": "uno de: verdura, fruta, pescado, carne, lacteo, cereal, legumbre, huevo, condimento, bebida, otro",
  "ingredients": [
    {
      "name": "nombre del ingrediente en español",
      "quantity": "número como cadena, ej. '200' o '1.5'; vacío si no aplica",
      "unit": "uno de: g, kg, ml, l, ud, cdta, cda, taza, pizca, al_gusto",
      "notes": "aclaraciones cortas, ej. 'picado fino'; vacío si no hay"
    }
  ],
  "instructions_md": "pasos de la receta numerados en Markdown ('1. ...\\n2. ...')",
  "notes": "comentarios o consejos del autor, vacío si no hay"
}

REGLAS:
- NO incluyas el ingrediente principal dentro del array "ingredients".
- Si dudas qué es el ingrediente principal, elige el que define el plato o el que aparece en mayor cantidad.
- Si el texto no parece una receta, devuelve title="No se ha podido extraer la receta" y el resto vacío o por defecto.
- Responde SOLO con el JSON, sin explicaciones adicionales.`;

export async function extractRecipeFromText(
  text: string,
  context?: { sourceUrl?: string; videoUrl?: string },
): Promise<RecipeDraft> {
  const client = getClient();

  const userParts: string[] = [
    "Extrae la receta del siguiente texto:\n\n",
    text.slice(0, 18000),
  ];
  if (context?.sourceUrl) userParts.push(`\n\nURL: ${context.sourceUrl}`);
  if (context?.videoUrl) userParts.push(`\n\nVídeo: ${context.videoUrl}`);

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userParts.join("") },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("La IA no devolvió respuesta.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("La IA devolvió una respuesta que no es JSON válido.");
  }

  return normalizeDraft(parsed, context);
}

type RawIngredient = {
  name?: string;
  quantity?: string | number;
  unit?: string;
  notes?: string;
};

type RawDraft = {
  title?: string;
  servings?: number;
  prep_minutes?: number | null;
  main_ingredient_name?: string;
  main_ingredient_category?: string;
  ingredients?: RawIngredient[];
  instructions_md?: string;
  notes?: string;
};

const VALID_UNITS: Unit[] = ["g", "kg", "ml", "l", "ud", "cdta", "cda", "taza", "pizca", "al_gusto"];
const VALID_CATEGORIES: IngredientCategory[] = [
  "verdura", "fruta", "pescado", "carne", "lacteo", "cereal",
  "legumbre", "huevo", "condimento", "bebida", "otro",
];

function normalizeDraft(
  raw: unknown,
  context?: { sourceUrl?: string; videoUrl?: string },
): RecipeDraft {
  const r = (raw ?? {}) as RawDraft;

  const category = VALID_CATEGORIES.includes(r.main_ingredient_category as IngredientCategory)
    ? (r.main_ingredient_category as IngredientCategory)
    : "otro";

  return {
    title: (r.title ?? "").trim() || "Sin título",
    servings:
      typeof r.servings === "number" && r.servings > 0
        ? Math.round(r.servings)
        : 2,
    prep_minutes:
      typeof r.prep_minutes === "number" && r.prep_minutes > 0
        ? Math.round(r.prep_minutes)
        : null,
    main_ingredient_name: (r.main_ingredient_name ?? "").trim() || "otro",
    main_ingredient_category: category,
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients
          .filter((i) => typeof i?.name === "string" && i.name.trim().length > 0)
          .map((i) => ({
            name: i.name!.trim(),
            quantity: i.quantity == null ? "" : String(i.quantity).trim(),
            unit: VALID_UNITS.includes(i.unit as Unit) ? (i.unit as Unit) : "al_gusto",
            notes: (i.notes ?? "").trim(),
          }))
      : [],
    instructions_md: (r.instructions_md ?? "").trim(),
    notes: (r.notes ?? "").trim(),
    source_type: context?.videoUrl ? "youtube" : context?.sourceUrl ? "url" : "manual",
    source_url: context?.sourceUrl ?? null,
    video_url: context?.videoUrl ?? null,
    pdf_url: null,
  };
}
