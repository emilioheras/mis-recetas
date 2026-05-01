import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTricks } from "@/lib/tricks/queries";

export default async function TricksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tricks = await listTricks(q);

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-5xl px-4 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
                Atajos de cocina
              </p>
              <h1 className="text-4xl sm:text-5xl">Trucos</h1>
            </div>
            <Button asChild>
              <Link href="/trucos/nuevo">
                <Plus className="h-4 w-4" /> Nuevo
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-8">
        <form className="mb-8 flex items-center gap-2" action="/trucos">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar truco…"
              className="border-0 border-b border-border bg-transparent pl-9 text-base focus-visible:rounded-none focus-visible:border-foreground focus-visible:ring-0 rounded-none"
            />
          </div>
          {q ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/trucos">Limpiar</Link>
            </Button>
          ) : null}
        </form>

        {tricks.length === 0 ? (
          <div className="py-16">
            <h2 className="mb-3 text-2xl">
              {q ? "Sin resultados" : "Aún no tienes trucos"}
            </h2>
            {q ? (
              <p className="text-muted-foreground">
                Prueba con otra búsqueda o{" "}
                <Link
                  href="/trucos"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  ver todos
                </Link>
                .
              </p>
            ) : (
              <Button asChild>
                <Link href="/trucos/nuevo">Crear mi primer truco</Link>
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {tricks.map((trick) => (
              <li key={trick.id}>
                <Link
                  href={`/trucos/${trick.id}`}
                  className="group flex items-baseline justify-between gap-4 py-3 transition-colors"
                >
                  <span className="text-lg font-medium leading-snug transition-colors group-hover:text-primary">
                    {trick.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
