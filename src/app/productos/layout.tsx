import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Frutas y verduras frescas a domicilio en Alajuela",
  description:
    "Compra frutas y verduras frescas en Altavera y recibe tu pedido a domicilio en nuestra zona de cobertura de Alajuela, Costa Rica.",
  path: "/productos",
});

export default function ProductosLayout({ children }: { children: ReactNode }) {
  return children;
}
