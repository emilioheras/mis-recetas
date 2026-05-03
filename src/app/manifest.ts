import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Recetas",
    short_name: "Mis Recetas",
    description: "Tus recetas, ordenadas y a mano.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF7",
    theme_color: "#AB3E1A",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
