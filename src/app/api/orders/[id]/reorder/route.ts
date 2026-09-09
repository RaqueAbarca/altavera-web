import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isMaturityPreference } from "@/lib/maturity";
import { isKilogramUnit } from "@/lib/productUnits";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OrderItemRow = {
  product_id: number | null;
  product_name: string;
  quantity: number | string;
  maturity_preference: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  order_item: OrderItemRow[] | null;
};

type ProductRow = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number | string;
  unit: string;
  image_url: string | null;
  maturity_selection_enabled: boolean | null;
  average_unit_weight_g: number | string | null;
  approx_units_per_kg_min: number | string | null;
  approx_units_per_kg_max: number | string | null;
  is_seasonal: boolean | null;
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function normalizeQuantity(quantity: number, unit: string) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      quantity: isKilogramUnit(unit) ? 0.5 : 1,
      adjusted: true,
    };
  }

  if (isKilogramUnit(unit)) {
    const normalized = Math.max(0.5, Math.round(quantity * 2) / 2);
    return {
      quantity: normalized,
      adjusted: Math.abs(normalized - quantity) > 1e-9,
    };
  }

  const normalized = Math.max(1, Math.round(quantity));
  return {
    quantity: normalized,
    adjusted: Math.abs(normalized - quantity) > 1e-9,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para volver a pedir" },
        { status: 401 }
      );
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        customer_id,
        user_id,
        order_item(
          product_id,
          product_name,
          quantity,
          maturity_preference
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (orderError) throw orderError;

    const order = orderData as OrderRow | null;

    if (
      !order ||
      (order.customer_id !== user.id && order.user_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const { data: productData, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        "id,name,description,category,price,unit,image_url,maturity_selection_enabled,average_unit_weight_g,approx_units_per_kg_min,approx_units_per_kg_max,is_seasonal"
      )
      .eq("is_active", true);

    if (productError) throw productError;

    const products = (productData ?? []) as ProductRow[];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const productsByName = new Map(
      products.map((product) => [normalizeName(product.name), product])
    );

    const unavailableProducts: string[] = [];
    const adjustedProducts: string[] = [];
    const items = (order.order_item ?? []).flatMap((item) => {
      const currentProduct =
        (item.product_id ? productsById.get(item.product_id) : undefined) ??
        productsByName.get(normalizeName(item.product_name));

      if (!currentProduct) {
        unavailableProducts.push(item.product_name);
        return [];
      }

      const originalQuantity = Number(item.quantity);
      const normalizedQuantity = normalizeQuantity(
        originalQuantity,
        currentProduct.unit
      );

      if (normalizedQuantity.adjusted) {
        adjustedProducts.push(currentProduct.name);
      }

      const maturityPreference =
        currentProduct.maturity_selection_enabled &&
        isMaturityPreference(item.maturity_preference)
          ? item.maturity_preference
          : null;

      return [
        {
          id: currentProduct.id,
          name: currentProduct.name,
          description: currentProduct.description ?? "",
          category: currentProduct.category,
          price: Number(currentProduct.price),
          unit: currentProduct.unit,
          image: currentProduct.image_url ?? "",
          quantity: normalizedQuantity.quantity,
          maturity_selection_enabled:
            currentProduct.maturity_selection_enabled ?? false,
          maturity_preference: maturityPreference,
          average_unit_weight_g:
            currentProduct.average_unit_weight_g === null
              ? null
              : Number(currentProduct.average_unit_weight_g),
          approx_units_per_kg_min:
            currentProduct.approx_units_per_kg_min === null
              ? null
              : Number(currentProduct.approx_units_per_kg_min),
          approx_units_per_kg_max:
            currentProduct.approx_units_per_kg_max === null
              ? null
              : Number(currentProduct.approx_units_per_kg_max),
          is_seasonal: currentProduct.is_seasonal ?? false,
        },
      ];
    });

    return NextResponse.json({
      items,
      unavailableProducts: [...new Set(unavailableProducts)],
      adjustedProducts: [...new Set(adjustedProducts)],
    });
  } catch (error) {
    console.error("ERROR PREPARANDO PEDIDO ANTERIOR:", error);

    return NextResponse.json(
      { error: "No pudimos preparar este pedido en este momento" },
      { status: 500 }
    );
  }
}
