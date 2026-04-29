import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mis Recetas",
  description: "Tus recetas, ordenadas y a mano.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
