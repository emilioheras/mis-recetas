import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChefHat,
  Lightbulb,
  Package2,
  ShoppingCart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: typeof ChefHat;
  // si false, no aparece en la barra inferior móvil (sigue accesible
  // desde el logo "Mis Recetas" arriba o desde la nav superior).
  mobile: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Hoy", icon: ChefHat, mobile: false },
  { href: "/recetas", label: "Recetas", icon: BookOpen, mobile: true },
  { href: "/menu", label: "Menú", icon: CalendarDays, mobile: true },
  { href: "/despensa", label: "Despensa", icon: Package2, mobile: true },
  { href: "/compra", label: "Compra", icon: ShoppingCart, mobile: true },
  { href: "/trucos", label: "Trucos", icon: Lightbulb, mobile: true },
];

const mobileNavItems = navItems.filter((it) => it.mobile);

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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4 px-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
          >
            Mis Recetas
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
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
