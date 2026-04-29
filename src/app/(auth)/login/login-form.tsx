"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus({ kind: "error", message: error.message });
    } else {
      setStatus({ kind: "sent" });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-md bg-accent p-4 text-sm">
        Revisa tu bandeja de entrada en <strong>{email}</strong> y pulsa el
        enlace que te hemos enviado para entrar.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="email"
        required
        placeholder="tu-email@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status.kind === "loading"}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={status.kind === "loading" || email.length === 0}
      >
        {status.kind === "loading" ? "Enviando..." : "Enviar enlace de acceso"}
      </Button>
      {status.kind === "error" ? (
        <p className="text-sm text-destructive">{status.message}</p>
      ) : null}
    </form>
  );
}
