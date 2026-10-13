import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  removeStorageImageIfUnused,
  resolveProductImagesBucket,
} from "@/lib/productImageStorage";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function detectImageFormat(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  return null;
}

async function getProduct(id: number) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,image_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function getProductId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: idParam } = await context.params;
    const id = getProductId(idParam);

    if (!id) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
    }

    const product = await getProduct(id);
    if (!product) {
      return NextResponse.json({ error: "El producto no existe" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Selecciona una imagen" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "La imagen debe ser JPG, PNG o WebP" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "La imagen debe pesar como máximo 5 MB" },
        { status: 400 }
      );
    }

    const rawBytes = await file.arrayBuffer();
    const bytes = new Uint8Array(rawBytes);
    const detectedFormat = detectImageFormat(bytes);

    if (!detectedFormat) {
      return NextResponse.json(
        { error: "El archivo seleccionado no parece ser una imagen JPG, PNG o WebP válida" },
        { status: 400 }
      );
    }

    const bucket = await resolveProductImagesBucket(product.image_url);
    const storagePath = `products/${id}/${Date.now()}-${crypto.randomUUID()}.${detectedFormat.extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, rawBytes, {
        contentType: detectedFormat.contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);
    const imageUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", id);

    if (updateError) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      throw updateError;
    }

    await removeStorageImageIfUnused(product.image_url, id);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("ERROR SUBIENDO IMAGEN DE PRODUCTO:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo subir la imagen del producto",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: idParam } = await context.params;
    const id = getProductId(idParam);

    if (!id) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
    }

    const product = await getProduct(id);
    if (!product) {
      return NextResponse.json({ error: "El producto no existe" }, { status: 404 });
    }

    const imageUrl = "/logo.svg";
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", id);

    if (updateError) throw updateError;

    await removeStorageImageIfUnused(product.image_url, id);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("ERROR QUITANDO IMAGEN DE PRODUCTO:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo quitar la imagen del producto",
      },
      { status: 500 }
    );
  }
}
