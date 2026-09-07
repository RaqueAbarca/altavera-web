import type { Metadata } from "next";

const SITE_URL = "https://www.altaveraenlinea.com";

export function getSiteUrl() {
  return new URL(SITE_URL);
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Altavera",
      locale: "es_CR",
      type: "website",
      images: [
        {
          url: "/heroBox.png",
          alt: "Caja Altavera con frutas y verduras frescas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/heroBox.png"],
    },
  };
}

export const privatePageMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};
