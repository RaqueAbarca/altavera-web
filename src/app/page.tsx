import { createPageMetadata, getSiteUrl } from "@/lib/seo";
import "@/components/home/home.css";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import FeaturedProducts from "@/components/home/FeaturedProducts";

export const metadata = createPageMetadata({
  title: "Frutas y verduras frescas a domicilio en Alajuela",
  description:
    "Compra frutas y verduras frescas en línea con Altavera y recibe tu pedido a domicilio en nuestra zona de cobertura de Alajuela, Costa Rica.",
  path: "/",
});

export default function Home() {
  const baseUrl = getSiteUrl().origin;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: `${baseUrl}/`,
        name: "Altavera",
        inLanguage: "es-CR",
      },
      {
        "@type": "OnlineStore",
        "@id": `${baseUrl}/#organization`,
        name: "Altavera",
        url: `${baseUrl}/`,
        logo: `${baseUrl}/logo.png`,
        description:
          "Tienda en línea costarricense de frutas y verduras frescas con entrega a domicilio en Alajuela.",
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Alajuela, Costa Rica",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+50686526792",
          contactType: "customer service",
          areaServed: "CR",
          availableLanguage: ["es"],
        },
        sameAs: ["https://www.instagram.com/altavera.cr/"],
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <Features />
      <FeaturedProducts />
    </>
  );
}
