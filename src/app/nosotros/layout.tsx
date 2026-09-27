import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Quiénes somos",
  description:
    "Conoce quiénes están detrás de Altavera, nuestra historia y el compromiso con una experiencia cercana para recibir frutas y verduras frescas en casa.",
  path: "/nosotros",
});

export default function NosotrosLayout({ children }: { children: ReactNode }) {
  return children;
}
