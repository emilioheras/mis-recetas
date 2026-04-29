import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompraPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Lista de la compra</h1>
      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Aquí podrás generar la lista de ingredientes del menú semanal,
            agrupados por categoría y escalados según los comensales.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Disponible cuando completes la <strong>Fase 8</strong> del plan.
        </CardContent>
      </Card>
    </div>
  );
}
