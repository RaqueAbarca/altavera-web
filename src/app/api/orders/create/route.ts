import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isMaturityPreference } from "@/lib/maturity";
import { DELIVERY_UNAVAILABLE_MESSAGE } from "@/lib/deliveryCoverage";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import { invokeNewOrderPush } from "@/lib/invokeNewOrderPush.server";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  hasCurrentLegalConsent,
} from "@/lib/legalConsent";
import { isPaymentMethod } from "@/lib/paymentMethods";

export const runtime = "nodejs";

type IncomingItem = {
  productId?: unknown;
  quantity?: unknown;
  maturityPreference?: unknown;
};

type IncomingOrder = {
  guest_name?: unknown;
  guest_phone?: unknown;
  guest_email?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  address_description?: unknown;
  customer_notes?: unknown;
  delivery_cycle_id?: unknown;
  legal_accepted?: unknown;
  marketing_opt_in?: unknown;
  payment_method?: unknown;
};

type IncomingBody = {
  order?: IncomingOrder;
  items?: IncomingItem[];
};

type ProductRow = {
  id: number;
  name: string;
  price: number | string;
  unit: string;
  is_active: boolean;
  maturity_selection_enabled: boolean;
};

type CreatedOrderRpcRow = {
  order_id: string;
  access_token: string;
  order_subtotal: number | string;
  order_shipping: number | string;
  order_total: number | string;
};

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}


async function subscribeMarketing({
  userId,
  email,
  phone,
  source,
  consentedAt,
}: {
  userId: string | null;
  email: string | null;
  phone: string;
  source: "account_checkout" | "guest_checkout";
  consentedAt: string;
}) {
  const rows: Array<{
    user_id: string | null;
    channel: "email" | "whatsapp";
    destination: string;
    status: "subscribed";
    consented_at: string;
    revoked_at: null;
    source: string;
    updated_at: string;
  }> = [];

  if (email) {
    rows.push({
      user_id: userId,
      channel: "email",
      destination: email.toLowerCase(),
      status: "subscribed",
      consented_at: consentedAt,
      revoked_at: null,
      source,
      updated_at: consentedAt,
    });
  }

  if (phone) {
    rows.push({
      user_id: userId,
      channel: "whatsapp",
      destination: phone,
      status: "subscribed",
      consented_at: consentedAt,
      revoked_at: null,
      source,
      updated_at: consentedAt,
    });
  }

  if (rows.length === 0) return;

  const { error } = await supabaseAdmin
    .from("marketing_subscriptions")
    .upsert(rows, { onConflict: "channel,destination" });

  if (error) throw error;
}

function isQuantityValid(quantity: number, unit: string) {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 1000
  ) {
    return false;
  }

  const normalizedUnit = unit.trim().toLowerCase();

  if (normalizedUnit === "kg") {
    return Math.abs(
      quantity * 2 - Math.round(quantity * 2)
    ) < 1e-9;
  }

  return Number.isInteger(quantity);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IncomingBody;
    const incomingOrder = body.order ?? {};
    const incomingItems = Array.isArray(body.items)
      ? body.items
      : [];

    if (
      incomingItems.length === 0 ||
      incomingItems.length > 100
    ) {
      return NextResponse.json(
        { error: "El carrito no contiene productos válidos" },
        { status: 400 }
      );
    }

    const guestName = cleanText(
      incomingOrder.guest_name,
      120
    );
    const guestPhone = cleanText(
      incomingOrder.guest_phone,
      30
    );
    const guestEmailRaw = cleanText(
      incomingOrder.guest_email,
      254
    );
    const addressDescription = cleanText(
      incomingOrder.address_description,
      500
    );
    const customerNotes = cleanText(
      incomingOrder.customer_notes,
      1000
    );

    if (!guestName) {
      return NextResponse.json(
        { error: "Ingresa el nombre del cliente" },
        { status: 400 }
      );
    }

    const phoneDigits = guestPhone.replace(/\D/g, "");

    if (
      phoneDigits.length < 8 ||
      phoneDigits.length > 15
    ) {
      return NextResponse.json(
        { error: "Ingresa un teléfono válido" },
        { status: 400 }
      );
    }

    if (
      guestEmailRaw &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmailRaw)
    ) {
      return NextResponse.json(
        { error: "Ingresa un correo válido" },
        { status: 400 }
      );
    }

    const legalAcceptedInput = incomingOrder.legal_accepted === true;
    const marketingOptIn = incomingOrder.marketing_opt_in === true;
    const paymentMethod = cleanText(incomingOrder.payment_method, 40);

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Selecciona un método de pago válido" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let accountConsent: {
      terms_version: string | null;
      terms_accepted_at: string | null;
      privacy_version: string | null;
      privacy_acknowledged_at: string | null;
      marketing_opt_in: boolean;
      marketing_opt_in_at: string | null;
    } | null = null;

    if (user) {
      const { data, error } = await supabaseAdmin
        .from("customer_consents")
        .select(
          "terms_version,terms_accepted_at,privacy_version,privacy_acknowledged_at,marketing_opt_in,marketing_opt_in_at"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("ERROR LEYENDO CONSENTIMIENTO DEL CLIENTE:", error);
      } else {
        accountConsent = data;
      }
    }

    const metadataTermsVersion =
      typeof user?.user_metadata?.terms_version === "string"
        ? user.user_metadata.terms_version
        : null;
    const metadataPrivacyVersion =
      typeof user?.user_metadata?.privacy_version === "string"
        ? user.user_metadata.privacy_version
        : null;

    const accountHasCurrentLegalConsent = Boolean(
      user &&
        hasCurrentLegalConsent({
          termsVersion:
            accountConsent?.terms_version ?? metadataTermsVersion,
          privacyVersion:
            accountConsent?.privacy_version ?? metadataPrivacyVersion,
        })
    );

    const accountMarketingOptIn =
      accountConsent?.marketing_opt_in === true ||
      user?.user_metadata?.marketing_opt_in === true;
    const effectiveMarketingOptIn =
      accountMarketingOptIn || marketingOptIn;

    if (!accountHasCurrentLegalConsent && !legalAcceptedInput) {
      return NextResponse.json(
        {
          error:
            "Debes aceptar los Términos y Condiciones para continuar con el pedido",
        },
        { status: 400 }
      );
    }

    const consentedNow = new Date().toISOString();
    const termsAcceptedAt = accountHasCurrentLegalConsent
      ? accountConsent?.terms_accepted_at ??
        (typeof user?.user_metadata?.terms_accepted_at === "string"
          ? user.user_metadata.terms_accepted_at
          : consentedNow)
      : consentedNow;
    const privacyAcknowledgedAt = accountHasCurrentLegalConsent
      ? accountConsent?.privacy_acknowledged_at ??
        (typeof user?.user_metadata?.privacy_acknowledged_at === "string"
          ? user.user_metadata.privacy_acknowledged_at
          : consentedNow)
      : consentedNow;

    if (user && (!accountHasCurrentLegalConsent || !accountConsent)) {
      const mergedMarketingOptIn = effectiveMarketingOptIn;

      const { error: consentError } = await supabaseAdmin
        .from("customer_consents")
        .upsert(
          {
            user_id: user.id,
            terms_version: TERMS_VERSION,
            terms_accepted_at: termsAcceptedAt,
            privacy_version: PRIVACY_VERSION,
            privacy_acknowledged_at: privacyAcknowledgedAt,
            marketing_opt_in: mergedMarketingOptIn,
            marketing_opt_in_at: mergedMarketingOptIn
              ? accountConsent?.marketing_opt_in_at ?? consentedNow
              : null,
            updated_at: consentedNow,
          },
          { onConflict: "user_id" }
        );

      if (consentError) {
        throw consentError;
      }
    }

    if (marketingOptIn) {
      await subscribeMarketing({
        userId: user?.id ?? null,
        email: guestEmailRaw || user?.email || null,
        phone: phoneDigits,
        source: user ? "account_checkout" : "guest_checkout",
        consentedAt: consentedNow,
      });
    }

    const latitude = Number(incomingOrder.latitude);
    const longitude = Number(incomingOrder.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      return NextResponse.json(
        { error: "Selecciona una ubicación de entrega válida" },
        { status: 400 }
      );
    }

    const deliveryAvailability =
      await evaluateDeliveryLocation(latitude, longitude);

    if (!deliveryAvailability.available) {
      return NextResponse.json(
        { error: DELIVERY_UNAVAILABLE_MESSAGE },
        { status: 400 }
      );
    }

    const deliveryCycleId = cleanText(
      incomingOrder.delivery_cycle_id,
      80
    );

    if (!deliveryCycleId) {
      return NextResponse.json(
        { error: "Selecciona una fecha de entrega" },
        { status: 400 }
      );
    }

    await syncDeliveryCycles();

    const {
      data: deliveryCycle,
      error: deliveryCycleError,
    } = await supabaseAdmin
      .from("delivery_cycles")
      .select("id,delivery_date,cutoff_at,status")
      .eq("id", deliveryCycleId)
      .maybeSingle();

    if (deliveryCycleError) {
      throw deliveryCycleError;
    }

    if (
      !deliveryCycle ||
      deliveryCycle.status !== "open" ||
      new Date(deliveryCycle.cutoff_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "El corte para esa entrega ya finalizó. Selecciona una nueva fecha para continuar.",
          code: "DELIVERY_CUTOFF_PASSED",
        },
        { status: 409 }
      );
    }

    const normalizedItems = incomingItems.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
      maturityPreference:
        typeof item.maturityPreference === "string" &&
        item.maturityPreference.trim()
          ? item.maturityPreference.trim()
          : null,
    }));

    if (
      normalizedItems.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          item.productId <= 0 ||
          !Number.isFinite(item.quantity)
      )
    ) {
      return NextResponse.json(
        { error: "El carrito contiene datos inválidos" },
        { status: 400 }
      );
    }

    const uniqueProductIds = new Set(
      normalizedItems.map((item) => item.productId)
    );

    if (uniqueProductIds.size !== normalizedItems.length) {
      return NextResponse.json(
        { error: "El carrito contiene productos duplicados" },
        { status: 400 }
      );
    }

    const productIds = [...uniqueProductIds];

    const {
      data: productData,
      error: productError,
    } = await supabaseAdmin
      .from("products")
      .select(
        "id,name,price,unit,is_active,maturity_selection_enabled"
      )
      .in("id", productIds)
      .eq("is_active", true);

    if (productError) {
      throw productError;
    }

    const products = (productData ?? []) as ProductRow[];

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Uno o más productos ya no están disponibles" },
        { status: 409 }
      );
    }

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const authoritativeItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Producto no encontrado");
      }

      if (!isQuantityValid(item.quantity, product.unit)) {
        throw new Error(
          `Cantidad inválida para ${product.name}`
        );
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(
          `Precio inválido para ${product.name}`
        );
      }

      if (
        item.maturityPreference &&
        !product.maturity_selection_enabled
      ) {
        throw new Error(
          `${product.name} no permite seleccionar maduración`
        );
      }

      if (
        item.maturityPreference &&
        !isMaturityPreference(item.maturityPreference)
      ) {
        throw new Error(
          `Preferencia de maduración inválida para ${product.name}`
        );
      }

      return {
        product_id: product.id,
        product_name: product.name,
        price: roundMoney(price),
        quantity: item.quantity,
        maturity_preference:
          product.maturity_selection_enabled
            ? item.maturityPreference
            : null,
      };
    });

    const subtotal = roundMoney(
      authoritativeItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    );

    const configuredShipping = Number(
      process.env.NEXT_PUBLIC_DELIVERY_FEE_CRC ?? 0
    );

    if (!Number.isFinite(configuredShipping) || configuredShipping < 0) {
      throw new Error("La tarifa de envío configurada no es válida");
    }

    const shipping = roundMoney(configuredShipping);
    const total = roundMoney(subtotal + shipping);

    const accessToken = randomUUID();

    const {
      data: createdOrder,
      error: orderError,
    } = await supabaseAdmin
      .rpc("altavera_create_order_with_items", {
        p_customer_id: user?.id ?? null,
        p_guest_name: guestName,
        p_guest_email: guestEmailRaw || null,
        p_guest_phone: phoneDigits,
        p_latitude: latitude,
        p_longitude: longitude,
        p_address_description: addressDescription || null,
        p_customer_notes: customerNotes || null,
        p_delivery_cycle_id: deliveryCycle.id,
        p_subtotal: subtotal,
        p_shipping: shipping,
        p_total: total,
        p_payment_method: paymentMethod,
        p_status: "pending_payment",
        p_order_access_token: accessToken,
        p_items: authoritativeItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          maturity_preference: item.maturity_preference,
        })),
      })
      .single();

    if (orderError || !createdOrder) {
      if (
        orderError?.message?.includes("DELIVERY_CUTOFF_PASSED")
      ) {
        return NextResponse.json(
          {
            error:
              "El corte para esa entrega ya finalizó. Selecciona una nueva fecha para continuar.",
            code: "DELIVERY_CUTOFF_PASSED",
          },
          { status: 409 }
        );
      }

      throw orderError ?? new Error("No se pudo crear el pedido");
    }

    const orderResult = createdOrder as CreatedOrderRpcRow;

    const { error: legalRecordError } = await supabaseAdmin
      .from("orders")
      .update({
        terms_version: TERMS_VERSION,
        terms_accepted_at: termsAcceptedAt,
        privacy_version: PRIVACY_VERSION,
        privacy_acknowledged_at: privacyAcknowledgedAt,
        marketing_opt_in: effectiveMarketingOptIn,
        marketing_opt_in_at: effectiveMarketingOptIn
          ? accountConsent?.marketing_opt_in_at ?? consentedNow
          : null,
      })
      .eq("id", orderResult.order_id);

    if (legalRecordError) {
      // El pedido ya fue creado. No devolvemos error para evitar duplicarlo
      // si el cliente intenta pagar otra vez, pero dejamos trazabilidad en logs.
      console.error(
        "ERROR GUARDANDO ACEPTACIÓN LEGAL DEL PEDIDO:",
        legalRecordError
      );
    }

    try {
      await invokeNewOrderPush({
        orderId: orderResult.order_id,
        total: Number(orderResult.order_total),
        deliveryDate: deliveryCycle.delivery_date,
      });
    } catch (pushError) {
      // La notificación nunca debe impedir que el pedido se confirme.
      console.error("ERROR ENVIANDO PUSH DE NUEVO PEDIDO:", pushError);
    }

    return NextResponse.json({
      id: orderResult.order_id,
      accessToken: orderResult.access_token,
      subtotal: Number(orderResult.order_subtotal),
      shipping: Number(orderResult.order_shipping),
      total: Number(orderResult.order_total),
    });
  } catch (error) {
    console.error("ERROR CREANDO PEDIDO SEGURO:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el pedido",
      },
      { status: 500 }
    );
  }
}
