import { listTrickCategories } from "@/lib/tricks/queries";
import { TrickForm } from "../trick-form";

export default async function NewTrickPage() {
  const existingCategories = await listTrickCategories();
  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-3xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Nuevo truco
          </p>
          <h1 className="text-4xl sm:text-5xl">Añadir truco</h1>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-8">
        <TrickForm
          trickId={null}
          initial={{
            title: "",
            notes: "",
            image_url: null,
            video_url: null,
            source_url: null,
            categories: [],
          }}
          existingCategories={existingCategories}
        />
      </div>
    </div>
  );
}
