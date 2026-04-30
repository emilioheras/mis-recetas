import type { IngredientCategory, Unit } from "@/lib/ingredients";

export type SourceType = "manual" | "url" | "markdown" | "youtube" | "pdf";

export type Ingredient = {
  id: string;
  name: string;
  normalized_name: string;
  category: IngredientCategory;
};

export type RecipeIngredientRow = {
  id: string;
  ingredient_id: string;
  ingredient: Ingredient;
  quantity: number | null;
  unit: Unit;
  is_main: boolean;
  notes: string | null;
  position: number;
};

export type RecipeListItem = {
  id: string;
  title: string;
  source_type: SourceType;
  prep_minutes: number | null;
  servings: number;
  main_ingredient: Pick<
    Ingredient,
    "id" | "name" | "normalized_name" | "category"
  > | null;
};

export type Recipe = {
  id: string;
  title: string;
  source_type: SourceType;
  source_url: string | null;
  video_url: string | null;
  pdf_url: string | null;
  servings: number;
  prep_minutes: number | null;
  instructions_md: string | null;
  notes: string | null;
  created_at: string;
  main_ingredient: Ingredient | null;
  ingredients: RecipeIngredientRow[];
};

export type IngredientFormRow = {
  name: string;
  quantity: string;
  unit: Unit;
  category: IngredientCategory;
  is_main: boolean;
  notes: string;
};

export type RecipeFormData = {
  title: string;
  servings: number;
  prep_minutes: number | null;
  instructions_md: string;
  notes: string;
  ingredients: IngredientFormRow[];
};

export type RecipeDraft = {
  title: string;
  servings: number;
  prep_minutes: number | null;
  ingredients: IngredientFormRow[];
  instructions_md: string;
  notes: string;
  source_type: SourceType;
  source_url: string | null;
  video_url: string | null;
  pdf_url: string | null;
};

export type RecipeSource = {
  type: SourceType;
  url?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
};
