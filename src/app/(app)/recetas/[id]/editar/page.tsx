import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes/queries";
import { RecipeForm } from "../../recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const otherIngredients = recipe.ingredients
    .filter((row) => !row.is_main)
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      name: row.ingredient.name,
      quantity: row.quantity === null ? "" : String(row.quantity),
      unit: row.unit,
      notes: row.notes ?? "",
    }));

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
          main_ingredient_name: recipe.main_ingredient?.name ?? "",
          main_ingredient_category: recipe.main_ingredient?.category ?? "otro",
          ingredients: otherIngredients,
        }}
      />
    </div>
  );
}
