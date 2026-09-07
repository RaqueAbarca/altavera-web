import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sobre Altavera",
  description:
    "Conoce Altavera, una marca costarricense que facilita recibir frutas y verduras frescas en casa con una experiencia de compra cercana y confiable.",
  path: "/nosotros",
});

export default function NosotrosLayout({ children }: { children: ReactNode }) {
  return children;
}
