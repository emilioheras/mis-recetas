import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startOfWeekMonday, toIsoDate } from "@/lib/menu-generator";
import { getMenuByWeekStart } from "@/lib/menu-queries";
import { getShoppingListByMenuId } from "@/lib/shopping-queries";
import { ShoppingView } from "./shopping-view";
import { GenerateListButton } from "./generate-button";

export default async function CompraPage() {
  const monday = startOfWeekMonday();
  const weekStart = toIsoDate(monday);
  const menuData = await getMenuByWeekStart(weekStart);

  return (
    <div>
      <div className="bg-band">
        <div className="container max-w-3xl px-4 py-12">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/60">
            Lo que vas a necesitar
          </p>
          <h1 className="text-4xl sm:text-5xl">Lista de la compra</h1>
          {menuData ? (
            <p className="mt-3 text-xs text-foreground/70">
              Cantidades escaladas a{" "}
              {menuData.menu.servings === 1
                ? "1 comensal"
                : `${menuData.menu.servings} comensales`}
              .
            </p>
          ) : null}
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-8">
        {!menuData ? (
          <Card>
            <CardHeader>
              <CardTitle>Aún no tienes menú esta semana</CardTitle>
              <CardDescription>
                Para generar la lista de la compra primero necesitas un menú
                semanal con recetas asignadas a cada día.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/menu">Ir a Menú semanal</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CompraContent
            menuId={menuData.menu.id}
            menuServings={menuData.menu.servings}
          />
        )}
      </div>
    </div>
  );
}

async function CompraContent({
  menuId,
  menuServings,
}: {
  menuId: string;
  menuServings: number;
}) {
  const list = await getShoppingListByMenuId(menuId);

  if (!list) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Genera tu lista de la compra</CardTitle>
          <CardDescription>
            Sumamos los ingredientes de todas las recetas del menú, escalados
            para <strong>{menuServings} comensales</strong>, y los agrupamos
            por categoría (verdulería, pescadería, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateListButton menuId={menuId} />
        </CardContent>
      </Card>
    );
  }

  return <ShoppingView menuId={menuId} menuServings={menuServings} list={list} />;
}
