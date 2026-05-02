import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrick } from "@/lib/tricks/queries";
import { getSignedImageUrl } from "@/lib/recipes/image-storage";
import { DeleteTrickButton } from "./delete-button";

export default async function TrickDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trick = await getTrick(id);
  if (!trick) notFound();

  const imageSignedUrl = trick.image_url
    ? await getSignedImageUrl(trick.image_url)
    : null;

  return (
    <article>
      <div className="bg-band">
        <div className="container max-w-3xl px-4 py-12">
          <Link
            href="/trucos"
            className="mb-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Trucos
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl leading-[1.05] sm:text-5xl">
                {trick.title}
              </h1>
              {trick.categories.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {trick.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/trucos/${trick.id}/editar`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <DeleteTrickButton trickId={trick.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-10">
        {trick.video_url ? (
          <div className="mb-8 aspect-video overflow-hidden rounded-md">
            <iframe
              src={toEmbedUrl(trick.video_url)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}

        {imageSignedUrl ? (
          <div className="mb-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={imageSignedUrl}
                alt={trick.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>
        ) : null}

        {trick.notes ? (
          <div className="whitespace-pre-wrap text-base leading-[1.75]">
            {trick.notes}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este truco aún no tiene notas.
          </p>
        )}

        {trick.source_url ? (
          <p className="mt-10 text-xs text-muted-foreground">
            Fuente:{" "}
            <a
              href={trick.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline"
            >
              {trick.source_url}
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
  } catch {}
  return url;
}
