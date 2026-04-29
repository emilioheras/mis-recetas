import { ImportWizard } from "./import-wizard";

export default function NewRecipePage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Nueva receta</h1>
      <ImportWizard />
    </div>
  );
}
