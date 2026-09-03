import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Altavera Admin",
  applicationName: "Altavera Admin",
  description: "Panel de administración de Altavera.",
  manifest: "/admin-manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1F402A",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
