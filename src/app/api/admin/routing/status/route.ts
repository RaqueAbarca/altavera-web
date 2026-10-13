import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { isOpenRouteServiceConfigured } from "@/lib/routing/openRouteService.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      provider: "openrouteservice",
      configured: isOpenRouteServiceConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
