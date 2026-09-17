import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const ALLOWED_STATUSES = new Set([
  "pending",
  "pending_payment",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

function cleanSearch(value: string) {
  return value.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const search = cleanSearch(url.searchParams.get("q") ?? "");
    const status = String(url.searchParams.get("status") ?? "").trim();
    const from = String(url.searchParams.get("from") ?? "").trim();
    const to = String(url.searchParams.get("to") ?? "").trim();
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const page = Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

    let query = supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          user_id,
          guest_name,
          guest_email,
          guest_phone,
          total,
          shipping,
          payment_method,
          status,
          created_at,
          address_description,
          delivery_cycle_id,
          delivery_cycles(delivery_date),
          order_item(id,product_name,quantity,unit,maturity_preference)
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all" && ALLOWED_STATUSES.has(status)) {
      if (status === "pending") {
        query = query.in("status", ["pending", "pending_payment"]);
      } else {
        query = query.eq("status", status);
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      query = query.gte("created_at", `${from}T00:00:00-06:00`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      query = query.lte("created_at", `${to}T23:59:59.999-06:00`);
    }

    if (search) {
      const conditions = [
        `guest_name.ilike.%${search}%`,
        `guest_email.ilike.%${search}%`,
      ];
      const phoneDigits = search.replace(/\D/g, "");
      if (phoneDigits.length >= 7) {
        conditions.push(`guest_phone.eq.${phoneDigits}`);
      }
      if (isUuid(search)) {
        conditions.push(`id.eq.${search}`);
      }
      query = query.or(conditions.join(","));
    }

    const fromIndex = (page - 1) * PAGE_SIZE;
    const toIndex = fromIndex + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(fromIndex, toIndex);

    if (error) throw error;

    return NextResponse.json({
      orders: data ?? [],
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("ERROR CARGANDO HISTORIAL DE PEDIDOS:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el historial de pedidos.",
      },
      { status: 500 }
    );
  }
}
