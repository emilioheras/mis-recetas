import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <main className="container max-w-3xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Bienvenido a Mis Recetas</CardTitle>
          <CardDescription>
            Antes de empezar, necesitas configurar tu base de datos y tu clave
            de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-6">
          <section>
            <h2 className="mb-2 text-base font-semibold">
              1. Crea un proyecto en Supabase
            </h2>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Entra a{" "}
                <a
                  className="text-primary underline"
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  supabase.com
                </a>
                {" "}y crea una cuenta gratuita.
              </li>
              <li>Pulsa &quot;New project&quot;, ponle un nombre y guarda la contraseña.</li>
              <li>
                Espera 1-2 minutos a que se aprovisione. Después ve a{" "}
                <strong>Settings → API</strong> y copia los valores
                &quot;Project URL&quot;, &quot;anon public&quot; y &quot;service_role&quot;.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold">
              2. (Opcional) Clave de IA para importadores
            </h2>
            <p className="mb-2">
              Solo es necesaria si vas a importar recetas desde URLs o vídeos
              de YouTube. Puedes saltártela ahora y añadirla más tarde.
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Entra a{" "}
                <a
                  className="text-primary underline"
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  console.groq.com/keys
                </a>{" "}
                con tu cuenta de Google/GitHub y pulsa &quot;Create API key&quot;
                (gratis, sin tarjeta).
              </li>
              <li>Cópiala (empieza por <code>gsk_...</code>) y guárdala.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold">
              3. Crea el archivo <code>.env.local</code>
            </h2>
            <p>
              En la raíz del proyecto, copia <code>.env.local.example</code>{" "}
              como <code>.env.local</code> y pega tus valores. Después reinicia
              el servidor (<code>npm run dev</code>).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold">
              4. Aplica la migración SQL
            </h2>
            <p>
              En el panel de Supabase, abre <strong>SQL Editor</strong>, pega el
              contenido del archivo{" "}
              <code>supabase/migrations/0001_initial_schema.sql</code> y pulsa
              Run. Después ve a <strong>Authentication → Providers → Email</strong>{" "}
              y desactiva &quot;Confirm email&quot; para que el login por enlace mágico
              funcione sin verificación inicial (opcional).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold">
              5. Añade tu email a la lista permitida
            </h2>
            <p>
              En el SQL Editor de Supabase, ejecuta:
            </p>
            <pre className="mt-2 rounded-md bg-muted p-3 text-xs">
{`-- Crea tu hogar
insert into households (name) values ('Mi familia') returning id;
-- Copia el id devuelto y úsalo aquí:
insert into allowed_emails (email, household_id)
values ('tu-email@ejemplo.com', 'PEGA-AQUI-EL-ID');`}
            </pre>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
