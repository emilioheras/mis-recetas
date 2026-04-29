import Link from "next/link";
import { redirect } from "next/navigation";
import { ChefHat, BookOpen, CalendarDays, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Inicio", icon: ChefHat },
  { href: "/recetas", label: "Recetas", icon: BookOpen },
  { href: "/menu", label: "Menú semanal", icon: CalendarDays },
  { href: "/compra", label: "Compra", icon: ShoppingCart },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ChefHat className="h-5 w-5 text-primary" />
            Mis Recetas
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="sticky bottom-0 grid grid-cols-4 border-t bg-card md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px]"
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
