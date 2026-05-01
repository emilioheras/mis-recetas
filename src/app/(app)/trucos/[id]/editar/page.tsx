import { notFound } from "next/navigation";
import { getTrick } from "@/lib/tricks/queries";
import { getSignedImageUrl } from "@/lib/recipes/image-storage";
import { TrickForm } from "../../trick-form";

export default async function EditTrickPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trick = await getTrick(id);
  if (!trick) notFound();

  const initialImageSignedUrl = trick.image_url
    ? await getSignedImageUrl(trick.image_url)
    : null;

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-3xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Editar truco
          </p>
          <h1 className="text-4xl sm:text-5xl">{trick.title}</h1>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-8">
        <TrickForm
          trickId={trick.id}
          initial={{
            title: trick.title,
            notes: trick.notes ?? "",
            image_url: trick.image_url,
            video_url: trick.video_url,
            source_url: trick.source_url,
          }}
          initialImageSignedUrl={initialImageSignedUrl}
        />
      </div>
    </div>
  );
}
