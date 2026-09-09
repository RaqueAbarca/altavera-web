import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";
import { DELIVERY_UNAVAILABLE_MESSAGE } from "@/lib/deliveryCoverage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      label?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      address_description?: unknown;
      is_default?: unknown;
    };

    const { data: current, error: currentError } = await supabaseAdmin
      .from("customer_addresses")
      .select("id,latitude,longitude,is_default")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentError) throw currentError;

    if (!current) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.label !== undefined) {
      const label = cleanText(body.label, 50);
      if (!label) {
        return NextResponse.json(
          { error: "La dirección necesita un nombre" },
          { status: 400 }
        );
      }
      update.label = label;
    }

    if (body.address_description !== undefined) {
      update.address_description = cleanText(body.address_description, 500) || null;
    }

    const latitude =
      body.latitude === undefined ? Number(current.latitude) : Number(body.latitude);
    const longitude =
      body.longitude === undefined ? Number(current.longitude) : Number(body.longitude);

    if (body.latitude !== undefined || body.longitude !== undefined) {
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

      update.latitude = latitude;
      update.longitude = longitude;
    }

    if (body.is_default === true && !current.is_default) {
      const { error: clearDefaultError } = await supabaseAdmin
        .from("customer_addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);

      if (clearDefaultError) throw clearDefaultError;
      update.is_default = true;
    }

    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id,label,latitude,longitude,address_description,is_default,created_at,updated_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ address: data });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO DIRECCIÓN:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la dirección" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { data: current, error: currentError } = await supabaseAdmin
      .from("customer_addresses")
      .select("id,is_default")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentError) throw currentError;

    if (!current) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    if (current.is_default) {
      const { data: replacement, error: replacementError } = await supabaseAdmin
        .from("customer_addresses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (replacementError) throw replacementError;

      if (replacement) {
        const { error: defaultError } = await supabaseAdmin
          .from("customer_addresses")
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq("id", replacement.id)
          .eq("user_id", user.id);

        if (defaultError) throw defaultError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ERROR ELIMINANDO DIRECCIÓN:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la dirección" },
      { status: 500 }
    );
  }
}
