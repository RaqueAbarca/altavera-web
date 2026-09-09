import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type UpdateProductBody = {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  unit?: unknown;
  imageUrl?: unknown;
  isActive?: unknown;
  isSeasonal?: unknown;
  maturitySelectionEnabled?: unknown;
  averageUnitWeightGrams?: unknown;
  unitsPerKgMin?: unknown;
  unitsPerKgMax?: unknown;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id: idParam } = await context.params;
    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID de producto inválido" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateProductBody;
    const updates: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = cleanText(body.name);

      if (!name) {
        return NextResponse.json(
          { error: "El nombre no puede quedar vacío" },
          { status: 400 }
        );
      }

      const { data: duplicate, error: duplicateError } =
        await supabaseAdmin
          .from("products")
          .select("id,name")
          .ilike("name", name)
          .neq("id", id)
          .limit(1)
          .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Ya existe un producto llamado ${duplicate.name}`,
          },
          { status: 409 }
        );
      }

      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      updates.description = cleanText(body.description);
    }

    if (Object.prototype.hasOwnProperty.call(body, "category")) {
      const category = cleanText(body.category);

      if (!category) {
        return NextResponse.json(
          { error: "La categoría no puede quedar vacía" },
          { status: 400 }
        );
      }

      updates.category = category;
    }

    if (Object.prototype.hasOwnProperty.call(body, "unit")) {
      const unit = cleanText(body.unit);

      if (!unit) {
        return NextResponse.json(
          { error: "La unidad no puede quedar vacía" },
          { status: 400 }
        );
      }

      updates.unit = unit;
    }

    if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
      updates.image_url = cleanText(body.imageUrl) || "/logo.svg";
    }

    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
      const isActive = body.isActive === true;

      if (isActive) {
        const { data: current, error: currentError } =
          await supabaseAdmin
            .from("products")
            .select("price")
            .eq("id", id)
            .maybeSingle();

        if (currentError) {
          throw currentError;
        }

        if (!current) {
          return NextResponse.json(
            { error: "El producto no existe" },
            { status: 404 }
          );
        }

        if (Number(current.price) <= 0) {
          return NextResponse.json(
            {
              error:
                "No puedes activar un producto con precio cero",
            },
            { status: 400 }
          );
        }
      }

      updates.is_active = isActive;
    }

    if (Object.prototype.hasOwnProperty.call(body, "isSeasonal")) {
      updates.is_seasonal = body.isSeasonal === true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "maturitySelectionEnabled"
      )
    ) {
      updates.maturity_selection_enabled =
        body.maturitySelectionEnabled === true;
    }


    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "averageUnitWeightGrams"
      )
    ) {
      const rawValue = body.averageUnitWeightGrams;
      const value =
        rawValue === null || cleanText(rawValue) === ""
          ? null
          : Number(rawValue);

      if (
        value !== null &&
        (!Number.isFinite(value) || value <= 0 || value > 100000)
      ) {
        return NextResponse.json(
          { error: "Ingresa un peso aproximado por unidad válido en gramos" },
          { status: 400 }
        );
      }

      updates.average_unit_weight_g = value;
    }

    if (Object.prototype.hasOwnProperty.call(body, "unitsPerKgMin")) {
      const rawValue = body.unitsPerKgMin;
      const value =
        rawValue === null || cleanText(rawValue) === ""
          ? null
          : Number(rawValue);

      if (
        value !== null &&
        (!Number.isFinite(value) || value <= 0 || value > 1000)
      ) {
        return NextResponse.json(
          { error: "Ingresa un mínimo válido de unidades por kg" },
          { status: 400 }
        );
      }

      updates.approx_units_per_kg_min = value;
    }

    if (Object.prototype.hasOwnProperty.call(body, "unitsPerKgMax")) {
      const rawValue = body.unitsPerKgMax;
      const value =
        rawValue === null || cleanText(rawValue) === ""
          ? null
          : Number(rawValue);

      if (
        value !== null &&
        (!Number.isFinite(value) || value <= 0 || value > 1000)
      ) {
        return NextResponse.json(
          { error: "Ingresa un máximo válido de unidades por kg" },
          { status: 400 }
        );
      }

      updates.approx_units_per_kg_max = value;
    }

    const nextMin = Object.prototype.hasOwnProperty.call(
      updates,
      "approx_units_per_kg_min"
    )
      ? (updates.approx_units_per_kg_min as number | null)
      : undefined;
    const nextMax = Object.prototype.hasOwnProperty.call(
      updates,
      "approx_units_per_kg_max"
    )
      ? (updates.approx_units_per_kg_max as number | null)
      : undefined;

    if (nextMin !== undefined || nextMax !== undefined) {
      const { data: currentRange, error: currentRangeError } =
        await supabaseAdmin
          .from("products")
          .select("approx_units_per_kg_min,approx_units_per_kg_max")
          .eq("id", id)
          .maybeSingle();

      if (currentRangeError) {
        throw currentRangeError;
      }

      if (!currentRange) {
        return NextResponse.json(
          { error: "El producto no existe" },
          { status: 404 }
        );
      }

      const effectiveMin =
        nextMin !== undefined
          ? nextMin
          : currentRange.approx_units_per_kg_min === null
            ? null
            : Number(currentRange.approx_units_per_kg_min);
      const effectiveMax =
        nextMax !== undefined
          ? nextMax
          : currentRange.approx_units_per_kg_max === null
            ? null
            : Number(currentRange.approx_units_per_kg_max);

      if (
        effectiveMin !== null &&
        effectiveMax !== null &&
        effectiveMin > effectiveMax
      ) {
        return NextResponse.json(
          { error: "El mínimo de unidades por kg no puede superar el máximo" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay cambios para guardar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", id)
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
        is_seasonal
      `)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "El producto no existe" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product: {
        ...data,
        price:
          data.price === null
            ? null
            : Number(data.price),
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
      },
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO PRODUCTO ADMIN:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el producto",
      },
      { status: 500 }
    );
  }
}
