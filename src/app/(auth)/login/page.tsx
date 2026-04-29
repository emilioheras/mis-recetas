import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Mis Recetas
        </p>
        <h1 className="mb-3 text-5xl leading-[0.95]">Entrar</h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Te enviaremos un enlace mágico al email para acceder.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
