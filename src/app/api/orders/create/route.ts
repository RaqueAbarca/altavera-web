import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isMaturityPreference } from "@/lib/maturity";
import { DELIVERY_UNAVAILABLE_MESSAGE } from "@/lib/deliveryCoverage";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import { invokeNewOrderPush } from "@/lib/invokeNewOrderPush.server";

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

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        p_payment_method: "SINPE",
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
