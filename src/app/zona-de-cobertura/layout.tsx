import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Entrega de frutas y verduras en Alajuela",
  description:
    "Consulta la zona de cobertura de Altavera y verifica si realizamos entregas de frutas y verduras frescas en tu ubicación de Alajuela.",
  path: "/zona-de-cobertura",
});

export default function CoverageLayout({ children }: { children: ReactNode }) {
  return children;
}
