import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function normalizeOrderReference(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/[^A-F0-9]/g, "");
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function phoneCandidates(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 11) return [];

  const candidates = new Set<number>();
  const local = digits.startsWith("506") && digits.length === 11
    ? digits.slice(3)
    : digits;

  for (const candidate of [digits, local, local.length === 8 ? `506${local}` : ""]) {
    if (!candidate) continue;
    const numeric = Number(candidate);
    if (Number.isSafeInteger(numeric)) candidates.add(numeric);
  }

  return [...candidates];
}

function genericNotFound() {
  return NextResponse.json(
    { error: "No pudimos encontrar un pedido con esos datos." },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      orderNumber?: unknown;
      contact?: unknown;
    };

    const orderReference = normalizeOrderReference(body.orderNumber);
    const contact = String(body.contact ?? "").trim();

    if (orderReference.length < 8 || orderReference.length > 32) {
      return NextResponse.json(
        { error: "Revisa el número de pedido e inténtalo de nuevo." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Ingresa el correo o WhatsApp usado en el pedido." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = contact.includes("@") ? normalizeEmail(contact) : "";
    const phones = email ? [] : phoneCandidates(contact);

    if (!email && phones.length === 0) {
      return NextResponse.json(
        { error: "Revisa el correo o WhatsApp ingresado." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let query = supabaseAdmin
      .from("orders")
      .select("id,order_access_token,created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    query = email
      ? query.ilike("guest_email", email)
      : query.in("guest_phone", phones);

    const { data, error } = await query;
    if (error) throw error;

    const match = (data ?? []).find((order) => {
      const normalizedId = String(order.id)
        .replace(/-/g, "")
        .toUpperCase();
      return normalizedId.startsWith(orderReference);
    });

    if (!match?.order_access_token) {
      return genericNotFound();
    }

    return NextResponse.json(
      {
        id: match.id,
        accessToken: match.order_access_token,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ERROR BUSCANDO PEDIDO PARA SEGUIMIENTO:", error);

    return NextResponse.json(
      { error: "No pudimos consultar el pedido en este momento." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
