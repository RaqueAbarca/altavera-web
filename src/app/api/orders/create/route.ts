import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type IncomingItem = {
  productId?: unknown;
  quantity?: unknown;
};

type IncomingOrder = {
  guest_name?: unknown;
  guest_phone?: unknown;
  guest_email?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  address_description?: unknown;
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
    const body = await request.json() as IncomingBody;
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

    const normalizedItems = incomingItems.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
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
      .select("id,name,price,unit,is_active")
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

      return {
        product_id: product.id,
        product_name: product.name,
        price: roundMoney(price),
        quantity: item.quantity,
      };
    });

    const subtotal = roundMoney(
      authoritativeItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    );

    // El envío se cobra por separado actualmente. El navegador
    // nunca decide shipping, subtotal, total, estado ni precios.
    const shipping = 0;
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
      .from("orders")
      .insert({
        customer_id: user?.id ?? null,
        user_id: user?.id ?? null,
        guest_name: guestName,
        guest_email: guestEmailRaw || null,
        guest_phone: phoneDigits,
        latitude,
        longitude,
        address_description: addressDescription || null,
        subtotal,
        shipping,
        total,
        payment_method: "SINPE",
        status: "pending_payment",
        order_access_token: accessToken,
      })
      .select("id,order_access_token,subtotal,shipping,total")
      .single();

    if (orderError || !createdOrder) {
      throw orderError ?? new Error("No se pudo crear el pedido");
    }

    const itemsToInsert = authoritativeItems.map((item) => ({
      ...item,
      order_id: createdOrder.id,
    }));

    const { error: itemError } = await supabaseAdmin
      .from("order_item")
      .insert(itemsToInsert);

    if (itemError) {
      await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", createdOrder.id);

      throw itemError;
    }

    return NextResponse.json({
      id: createdOrder.id,
      accessToken: createdOrder.order_access_token,
      subtotal: Number(createdOrder.subtotal),
      shipping: Number(createdOrder.shipping),
      total: Number(createdOrder.total),
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
