import { listCategoriesWithRecipeCount } from "@/lib/recipes/queries";
import { listTrickCategoriesWithCount } from "@/lib/tricks/queries";
import { CategoriesView } from "./categories-view";

export default async function CategoriasPage() {
  const [recipeCategories, trickCategories] = await Promise.all([
    listCategoriesWithRecipeCount(),
    listTrickCategoriesWithCount(),
  ]);

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-5xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Organiza tus etiquetas
          </p>
          <h1 className="text-4xl sm:text-5xl">Categorías</h1>
          <p className="mt-3 max-w-xl text-sm text-foreground/70">
            Renombra o borra las categorías que usas para clasificar recetas y
            trucos. Borrar una categoría no borra las recetas o trucos que la
            tenían: solo elimina la etiqueta.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-8">
        <CategoriesView
          recipeCategories={recipeCategories}
          trickCategories={trickCategories}
        />
      </div>
    </div>
  );
}
