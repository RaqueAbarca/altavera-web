import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contacto",
  description:
    "Contacta a Altavera para consultas sobre productos, pedidos, entregas y zona de cobertura en Alajuela.",
  path: "/contacto",
});

export default function ContactoLayout({ children }: { children: ReactNode }) {
  return children;
}
