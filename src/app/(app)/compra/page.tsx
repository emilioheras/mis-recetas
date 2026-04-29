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
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Lista de la compra</h1>

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
