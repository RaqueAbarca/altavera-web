"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import AdminHeader from "./AdminHeader";

export default function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <AdminHeader />;
  }

  return <Header />;
}
