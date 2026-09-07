import type { Metadata } from "next";
import "./globals.css";
import "@/components/info/infoPages.css";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Altavera | Frutas y verduras frescas a domicilio en Alajuela",
    template: "%s | Altavera",
  },
  description:
    "Compra frutas y verduras frescas en línea con Altavera y recibe tu pedido a domicilio en nuestra zona de cobertura de Alajuela, Costa Rica.",
  applicationName: "Altavera",
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: "Altavera",
    locale: "es_CR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CR">
      <body suppressHydrationWarning>
        <CartProvider>
          <SiteHeader />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
