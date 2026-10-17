import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { isMaturityPreference } from "@/lib/maturity";
import { isValidProductQuantity } from "@/lib/productUnits";
import {
  calculateVariantPrice,
  findProductSizeVariant,
  formatVariantSnapshotName,
  getVariantQuantityUnit,
  normalizeProductSizeVariants,
} from "@/lib/productVariants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

type PatchBody = {
  productId?: unknown;
  quantity?: unknown;
  variantId?: unknown;
  maturityPreference?: unknown;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cleanOptionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id, itemId } = await context.params;
    const body = (await request.json()) as PatchBody;
    const productId = Number(body.productId);
    const quantity = Number(body.quantity);
    const variantId = cleanOptionalText(body.variantId);
    const maturityPreference = cleanOptionalText(body.maturityPreference);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Seleccioná un producto válido." },
        { status: 400 }
      );
    }

    const [orderResult, itemResult, productResult] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id,status,subtotal,shipping,total,delivery_cycle_id")
        .eq("id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("order_item")
        .select("id,order_id,product_id,product_name,price,quantity,unit,maturity_preference")
        .eq("id", itemId)
        .eq("order_id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("products")
        .select("id,name,price,unit,is_active,maturity_selection_enabled,variant_selection_enabled,size_variants")
        .eq("id", productId)
        .maybeSingle(),
    ]);

    if (orderResult.error) throw orderResult.error;
    if (itemResult.error) throw itemResult.error;
    if (productResult.error) throw productResult.error;

    const order = orderResult.data;
    const oldItem = itemResult.data;
    const product = productResult.data;

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    if (!oldItem) {
      return NextResponse.json(
        { error: "El producto ya no pertenece a este pedido. Recargá el panel." },
        { status: 409 }
      );
    }

    if (!product || product.is_active === false) {
      return NextResponse.json(
        { error: "Ese producto ya no está disponible en el catálogo." },
        { status: 409 }
      );
    }

    if (order.status === "cancelled" || order.status === "delivered") {
      return NextResponse.json(
        { error: "No se puede editar un pedido cancelado o ya entregado." },
        { status: 409 }
      );
    }

    const variants = normalizeProductSizeVariants(product.size_variants);
    const selectedVariant = product.variant_selection_enabled
      ? findProductSizeVariant(variants, variantId)
      : null;
    const keepingCurrentSnapshot =
      Number(oldItem.product_id) === Number(product.id) && variantId === null;

    if (
      product.variant_selection_enabled &&
      !keepingCurrentSnapshot &&
      (!selectedVariant || selectedVariant.active === false)
    ) {
      return NextResponse.json(
        { error: `Seleccioná una presentación disponible para ${product.name}.` },
        { status: 400 }
      );
    }

    const effectiveUnit = keepingCurrentSnapshot
      ? String(oldItem.unit ?? product.unit ?? "").trim()
      : selectedVariant
        ? getVariantQuantityUnit(selectedVariant)
        : String(product.unit ?? "").trim();

    if (!effectiveUnit || !isValidProductQuantity(quantity, effectiveUnit)) {
      return NextResponse.json(
        {
          error: isValidProductQuantity(0.5, effectiveUnit)
            ? "Para productos por kilo usá cantidades de 0,5 kg en 0,5 kg."
            : "Ingresá una cantidad válida en unidades enteras.",
        },
        { status: 400 }
      );
    }

    const calculatedPrice = keepingCurrentSnapshot
      ? Number(oldItem.price)
      : selectedVariant
        ? calculateVariantPrice(Number(product.price), selectedVariant)
        : Number(product.price);

    if (
      calculatedPrice === null ||
      !Number.isFinite(calculatedPrice) ||
      calculatedPrice < 0
    ) {
      return NextResponse.json(
        { error: `El precio de ${product.name} no es válido.` },
        { status: 409 }
      );
    }

    if (
      maturityPreference !== null &&
      (!product.maturity_selection_enabled || !isMaturityPreference(maturityPreference))
    ) {
      return NextResponse.json(
        { error: "La preferencia de maduración seleccionada no es válida." },
        { status: 400 }
      );
    }

    const nextItem = {
      product_id: Number(product.id),
      product_name: keepingCurrentSnapshot
        ? String(oldItem.product_name)
        : selectedVariant
          ? formatVariantSnapshotName(String(product.name), selectedVariant)
          : String(product.name),
      price: roundMoney(calculatedPrice),
      quantity,
      unit: effectiveUnit,
      maturity_preference: product.maturity_selection_enabled
        ? maturityPreference
        : null,
    };

    const { data: updatedItem, error: itemUpdateError } = await supabaseAdmin
      .from("order_item")
      .update(nextItem)
      .eq("id", itemId)
      .eq("order_id", id)
      .select("id")
      .maybeSingle();

    if (itemUpdateError) throw itemUpdateError;

    if (!updatedItem) {
      return NextResponse.json(
        { error: "El pedido cambió mientras lo editabas. Recargá e intentá de nuevo." },
        { status: 409 }
      );
    }

    const { data: currentItems, error: currentItemsError } = await supabaseAdmin
      .from("order_item")
      .select("price,quantity")
      .eq("order_id", id);

    if (currentItemsError) {
      await supabaseAdmin
        .from("order_item")
        .update({
          product_id: oldItem.product_id,
          product_name: oldItem.product_name,
          price: oldItem.price,
          quantity: oldItem.quantity,
          unit: oldItem.unit,
          maturity_preference: oldItem.maturity_preference,
        })
        .eq("id", itemId)
        .eq("order_id", id);
      throw currentItemsError;
    }

    const subtotal = roundMoney(
      (currentItems ?? []).reduce(
        (sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0),
        0
      )
    );
    const shipping = roundMoney(Number(order.shipping ?? 0));
    const total = roundMoney(subtotal + shipping);
    const oldTotal = roundMoney(Number(order.total ?? 0));

    const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ subtotal, total })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (orderUpdateError || !updatedOrder) {
      await supabaseAdmin
        .from("order_item")
        .update({
          product_id: oldItem.product_id,
          product_name: oldItem.product_name,
          price: oldItem.price,
          quantity: oldItem.quantity,
          unit: oldItem.unit,
          maturity_preference: oldItem.maturity_preference,
        })
        .eq("id", itemId)
        .eq("order_id", id);

      if (orderUpdateError) throw orderUpdateError;
      return NextResponse.json(
        { error: "No se pudo actualizar el total del pedido. Intentá de nuevo." },
        { status: 409 }
      );
    }

    let closureStatus: string | null = null;
    if (order.delivery_cycle_id) {
      const { data: closure } = await supabaseAdmin
        .from("money_closures")
        .select("status")
        .eq("delivery_cycle_id", order.delivery_cycle_id)
        .maybeSingle();
      closureStatus = closure?.status ?? null;
    }

    return NextResponse.json({
      ok: true,
      item: nextItem,
      subtotal,
      shipping,
      total,
      oldTotal,
      difference: roundMoney(total - oldTotal),
      closureStatus,
    });
  } catch (error) {
    console.error("ERROR EDITANDO PRODUCTO DEL PEDIDO:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo editar el producto del pedido.",
      },
      { status: 500 }
    );
  }
}
