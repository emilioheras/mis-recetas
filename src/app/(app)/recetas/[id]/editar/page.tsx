import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes/queries";
import { getSignedImageUrl } from "@/lib/recipes/image-storage";
import { RecipeForm } from "../../recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const ingredients = recipe.ingredients
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      name: row.ingredient.name,
      quantity: row.quantity === null ? "" : String(row.quantity),
      unit: row.unit,
      category: row.ingredient.category,
      is_main: row.is_main,
      is_pantry: row.ingredient.is_pantry ?? false,
      notes: row.notes ?? "",
    }));

  // Garantiza que haya al menos un principal (compatibilidad con recetas
  // antiguas en las que el principal podía estar fuera de la lista de filas).
  if (!ingredients.some((r) => r.is_main)) {
    if (recipe.main_ingredient && ingredients.length > 0) {
      const idx = ingredients.findIndex(
        (r) => r.name === recipe.main_ingredient!.name,
      );
      if (idx >= 0) ingredients[idx].is_main = true;
      else ingredients[0].is_main = true;
    } else if (ingredients.length > 0) {
      ingredients[0].is_main = true;
    }
  }

  const initialImageSignedUrl = recipe.image_url
    ? await getSignedImageUrl(recipe.image_url)
    : null;

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Editar receta</h1>
      <RecipeForm
        recipeId={recipe.id}
        initial={{
          title: recipe.title,
          servings: recipe.servings,
          prep_minutes: recipe.prep_minutes,
          instructions_md: recipe.instructions_md ?? "",
          notes: recipe.notes ?? "",
          ingredients,
        }}
        source={{
          type: recipe.source_type,
          url: recipe.source_url,
          videoUrl: recipe.video_url,
          pdfUrl: recipe.pdf_url,
          imageUrl: recipe.image_url,
        }}
        initialImageSignedUrl={initialImageSignedUrl}
      />
    </div>
  );
}
