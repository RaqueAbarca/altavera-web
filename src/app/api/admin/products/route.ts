import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeProductSizeVariants } from "@/lib/productVariants";

export const runtime = "nodejs";

type CreateProductBody = {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  price?: unknown;
  unit?: unknown;
  imageUrl?: unknown;
  isActive?: unknown;
  isSeasonal?: unknown;
  maturitySelectionEnabled?: unknown;
  averageUnitWeightGrams?: unknown;
  unitsPerKgMin?: unknown;
  unitsPerKgMax?: unknown;
  variantSelectionEnabled?: unknown;
  sizeVariants?: unknown;
};

function toBoolean(value: unknown) {
  return value === true;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      description,
      category,
      price,
      unit,
      image_url,
      featured,
      is_active,
      maturity_selection_enabled,
      average_unit_weight_g,
      approx_units_per_kg_min,
      approx_units_per_kg_max,
      is_seasonal,
      variant_selection_enabled,
      size_variants
    `)
    .order("name");

  if (error) {
    console.error("ERROR CARGANDO PRODUCTOS ADMIN:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los productos" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: (data ?? []).map((product) => ({
      ...product,
      price:
        product.price === null
          ? null
          : Number(product.price),
      is_active: product.is_active ?? true,
      is_seasonal: product.is_seasonal ?? false,
      maturity_selection_enabled:
        product.maturity_selection_enabled ?? false,
      average_unit_weight_g:
        product.average_unit_weight_g === null
          ? null
          : Number(product.average_unit_weight_g),
      approx_units_per_kg_min:
        product.approx_units_per_kg_min === null
          ? null
          : Number(product.approx_units_per_kg_min),
      approx_units_per_kg_max:
        product.approx_units_per_kg_max === null
          ? null
          : Number(product.approx_units_per_kg_max),
      variant_selection_enabled: product.variant_selection_enabled ?? false,
      size_variants: normalizeProductSizeVariants(product.size_variants),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateProductBody;

    const name = cleanText(body.name);
    const description = cleanText(body.description);
    const category = cleanText(body.category);
    const unit = cleanText(body.unit);
    const imageUrl = cleanText(body.imageUrl) || "/logo.svg";
    const price = Number(body.price);
    const isActive = toBoolean(body.isActive);
    const isSeasonal = toBoolean(body.isSeasonal);
    const maturitySelectionEnabled = toBoolean(
      body.maturitySelectionEnabled
    );
    const variantSelectionEnabled = toBoolean(body.variantSelectionEnabled);
    const sizeVariants = normalizeProductSizeVariants(body.sizeVariants);
    const averageUnitWeightGrams =
      body.averageUnitWeightGrams === null ||
      body.averageUnitWeightGrams === undefined ||
      cleanText(body.averageUnitWeightGrams) === ""
        ? null
        : Number(body.averageUnitWeightGrams);
    const unitsPerKgMin =
      body.unitsPerKgMin === null ||
      body.unitsPerKgMin === undefined ||
      cleanText(body.unitsPerKgMin) === ""
        ? null
        : Number(body.unitsPerKgMin);
    const unitsPerKgMax =
      body.unitsPerKgMax === null ||
      body.unitsPerKgMax === undefined ||
      cleanText(body.unitsPerKgMax) === ""
        ? null
        : Number(body.unitsPerKgMax);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "La categoría es obligatoria" },
        { status: 400 }
      );
    }

    if (!unit) {
      return NextResponse.json(
        { error: "La unidad de venta es obligatoria" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "Ingresa un precio válido" },
        { status: 400 }
      );
    }

    if (
      averageUnitWeightGrams !== null &&
      (!Number.isFinite(averageUnitWeightGrams) ||
        averageUnitWeightGrams <= 0 ||
        averageUnitWeightGrams > 100000)
    ) {
      return NextResponse.json(
        { error: "Ingresa un peso aproximado por unidad válido en gramos" },
        { status: 400 }
      );
    }

    if (
      (unitsPerKgMin !== null &&
        (!Number.isFinite(unitsPerKgMin) ||
          unitsPerKgMin <= 0 ||
          unitsPerKgMin > 1000)) ||
      (unitsPerKgMax !== null &&
        (!Number.isFinite(unitsPerKgMax) ||
          unitsPerKgMax <= 0 ||
          unitsPerKgMax > 1000))
    ) {
      return NextResponse.json(
        { error: "Ingresa un rango válido de unidades por kg" },
        { status: 400 }
      );
    }

    if (
      unitsPerKgMin !== null &&
      unitsPerKgMax !== null &&
      unitsPerKgMin > unitsPerKgMax
    ) {
      return NextResponse.json(
        { error: "El mínimo de unidades por kg no puede superar el máximo" },
        { status: 400 }
      );
    }

    if (variantSelectionEnabled && sizeVariants.filter((variant) => variant.active).length === 0) {
      return NextResponse.json(
        { error: "Agrega al menos un tamaño activo antes de habilitar la venta por tamaño" },
        { status: 400 }
      );
    }

    if (sizeVariants.some((variant) => variant.price <= 0)) {
      return NextResponse.json(
        { error: "Cada tamaño debe tener un precio mayor a cero" },
        { status: 400 }
      );
    }

    if (isActive && price <= 0) {
      return NextResponse.json(
        {
          error:
            "Un producto activo debe tener un precio mayor a cero",
        },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from("products")
        .select("id,name")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error: `Ya existe un producto llamado ${existing.name}`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        description,
        category,
        price,
        unit,
        image_url: imageUrl,
        featured: false,
        is_active: isActive,
        is_seasonal: isSeasonal,
        maturity_selection_enabled: maturitySelectionEnabled,
        average_unit_weight_g: averageUnitWeightGrams,
        approx_units_per_kg_min: unitsPerKgMin,
        approx_units_per_kg_max: unitsPerKgMax,
        variant_selection_enabled: variantSelectionEnabled,
        size_variants: sizeVariants,
      })
      .select(`
        id,
        name,
        description,
        category,
        price,
        unit,
        image_url,
        featured,
        is_active,
        maturity_selection_enabled,
        average_unit_weight_g,
        approx_units_per_kg_min,
        approx_units_per_kg_max,
        is_seasonal,
        variant_selection_enabled,
        size_variants
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        product: {
          ...data,
          price: Number(data.price),
          average_unit_weight_g:
            data.average_unit_weight_g === null
              ? null
              : Number(data.average_unit_weight_g),
          approx_units_per_kg_min:
            data.approx_units_per_kg_min === null
              ? null
              : Number(data.approx_units_per_kg_min),
          approx_units_per_kg_max:
            data.approx_units_per_kg_max === null
              ? null
              : Number(data.approx_units_per_kg_max),
          variant_selection_enabled: data.variant_selection_enabled ?? false,
          size_variants: normalizeProductSizeVariants(data.size_variants),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERROR CREANDO PRODUCTO ADMIN:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el producto",
      },
      { status: 500 }
    );
  }
}
