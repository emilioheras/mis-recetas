import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MenuPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="mb-6 text-3xl font-bold">Menú semanal</h1>
      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Aquí podrás generar un menú automático para los 7 días eligiendo
            entre tus recetas, evitando repetir ingrediente principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Disponible cuando completes la <strong>Fase 7</strong> del plan.
        </CardContent>
      </Card>
    </div>
  );
}
