import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default function PrivatePageLayout({ children }: { children: ReactNode }) {
  return children;
}
