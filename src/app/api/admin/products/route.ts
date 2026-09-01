import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
      is_seasonal
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
        is_seasonal
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
