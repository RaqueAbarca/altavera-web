import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";
import { DELIVERY_UNAVAILABLE_MESSAGE } from "@/lib/deliveryCoverage";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("customer_addresses")
    .select(
      "id,label,latitude,longitude,address_description,is_default,created_at,updated_at"
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ERROR LEYENDO DIRECCIONES:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar tus direcciones" },
      { status: 500 }
    );
  }

  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      label?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      address_description?: unknown;
      is_default?: unknown;
    };

    const label = cleanText(body.label, 50) || "Mi dirección";
    const addressDescription = cleanText(body.address_description, 500);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
    }

    const availability = await evaluateDeliveryLocation(latitude, longitude);

    if (!availability.available) {
      return NextResponse.json(
        { error: DELIVERY_UNAVAILABLE_MESSAGE },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;

    const makeDefault = count === 0 || body.is_default === true;

    if (makeDefault && (count ?? 0) > 0) {
      const { error: clearDefaultError } = await supabaseAdmin
        .from("customer_addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);

      if (clearDefaultError) throw clearDefaultError;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .insert({
        user_id: user.id,
        label,
        latitude,
        longitude,
        address_description: addressDescription || null,
        is_default: makeDefault,
        created_at: now,
        updated_at: now,
      })
      .select(
        "id,label,latitude,longitude,address_description,is_default,created_at,updated_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ address: data }, { status: 201 });
  } catch (error) {
    console.error("ERROR GUARDANDO DIRECCIÓN:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la dirección" },
      { status: 500 }
    );
  }
}
