import type { Metadata } from "next";
import "./globals.css";
import "@/components/info/infoPages.css";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
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
