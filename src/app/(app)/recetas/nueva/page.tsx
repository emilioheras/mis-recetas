import { listCategories } from "@/lib/recipes/queries";
import { ImportWizard } from "./import-wizard";

export default async function NewRecipePage() {
  const existingCategories = await listCategories();
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Nueva receta</h1>
      <ImportWizard existingCategories={existingCategories} />
    </div>
  );
}
