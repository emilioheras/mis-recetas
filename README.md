# Mis Recetas

App web para tener todas tus recetas (papel, PDF, web, YouTube) en un solo
sitio, con menú semanal automático, lista de la compra y receta del día por
temporada.

## Primeros pasos

1. **Instala las dependencias**

   ```bash
   npm install
   ```

2. **Crea un proyecto en Supabase**

   - Entra a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
   - Pulsa "New project". Anota la contraseña que pongas.
   - Espera 1-2 minutos a que se aprovisione.

3. **Aplica la migración SQL**

   En el panel de Supabase, abre **SQL Editor** → **New query**, pega el
   contenido de `supabase/migrations/0001_initial_schema.sql` y pulsa Run.

4. **Obtén tus claves**

   En **Settings → API** copia:
   - Project URL
   - anon public
   - service_role (mantenla en secreto)

5. **(Opcional) Crea una API key de Groq**

   Solo necesaria para importar recetas desde URL o YouTube (fases 3 y 5).
   Puedes saltarte este paso ahora y añadirla cuando llegues a esas fases.

   En [console.groq.com/keys](https://console.groq.com/keys) pulsa
   "Create API key" (gratis, sin tarjeta, modelos Llama 3.3 70B).

6. **Configura `.env.local`**

   ```bash
   cp .env.local.example .env.local
   ```

   Edita el archivo y pega tus valores.

7. **Crea tu hogar y autoriza tu email**

   En el SQL Editor de Supabase ejecuta:

   ```sql
   insert into households (name) values ('Mi familia') returning id;
   ```

   Copia el `id` que devuelve. Después:

   ```sql
   insert into allowed_emails (email, household_id)
   values ('tu-email@ejemplo.com', 'EL-ID-DEL-HOGAR');
   ```

8. **Arranca el servidor**

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) y entra con el email
   que hayas autorizado.

## Stack

- **Next.js 15** + **TypeScript** — frontend y backend en un solo proyecto
- **Tailwind CSS** + **shadcn/ui** — estilos y componentes
- **Supabase** — base de datos (Postgres), autenticación y almacenamiento
- **Groq + Llama 3.3 70B** — extracción de recetas desde URLs y YouTube (gratis)
- **Vercel** — despliegue gratuito

## Estructura

```
src/
├── app/
│   ├── (auth)/login/         # Login con magic link
│   ├── (app)/                # Pantallas autenticadas
│   │   ├── page.tsx          # Receta del día (home)
│   │   ├── recetas/          # CRUD de recetas
│   │   ├── menu/             # Menú semanal
│   │   └── compra/           # Lista de la compra
│   ├── auth/callback/        # OAuth callback de Supabase
│   └── setup/                # Asistente de configuración inicial
├── components/ui/            # Componentes de UI (shadcn)
├── lib/
│   ├── supabase/             # Clientes server/browser/middleware
│   └── utils.ts
└── middleware.ts             # Protege rutas y refresca sesión

supabase/migrations/          # Esquema SQL
```

## Despliegue

1. Sube el repo a GitHub.
2. Importa el proyecto en [vercel.com](https://vercel.com).
3. Añade las mismas variables de entorno de `.env.local` en Vercel.
4. Deploy automático en cada push.
