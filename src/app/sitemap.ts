import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl().origin;

  const routes = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/productos", changeFrequency: "daily", priority: 0.9 },
    { path: "/nosotros", changeFrequency: "monthly", priority: 0.7 },
    { path: "/zona-de-cobertura", changeFrequency: "weekly", priority: 0.8 },
    { path: "/contacto", changeFrequency: "monthly", priority: 0.7 },
    { path: "/preguntas-frecuentes", changeFrequency: "monthly", priority: 0.6 },
    { path: "/ayuda", changeFrequency: "monthly", priority: 0.5 },
    { path: "/envios", changeFrequency: "monthly", priority: 0.5 },
    { path: "/cambios-y-devoluciones", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terminos-y-condiciones", changeFrequency: "yearly", priority: 0.3 },
  ] as const;

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }));
}
