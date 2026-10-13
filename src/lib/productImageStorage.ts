import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ParsedStorageUrl = {
  bucket: string;
  path: string;
};

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseSupabaseStorageUrl(url: string | null | undefined): ParsedStorageUrl | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (configuredSupabaseUrl) {
      const projectUrl = new URL(configuredSupabaseUrl);
      if (parsed.host !== projectUrl.host) return null;
    }

    const match = parsed.pathname.match(
      /\/storage\/v1\/(?:object\/public|render\/image\/public)\/([^/]+)\/(.+)$/
    );

    if (!match) return null;

    return {
      bucket: decodePathPart(match[1]),
      path: match[2]
        .split("/")
        .map(decodePathPart)
        .join("/"),
    };
  } catch {
    return null;
  }
}

export async function resolveProductImagesBucket(currentImageUrl?: string | null) {
  const configured = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim();
  if (configured) return configured;

  const current = parseSupabaseStorageUrl(currentImageUrl);
  if (current?.bucket) return current.bucket;

  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("image_url")
    .not("image_url", "is", null)
    .limit(100);

  if (!productsError) {
    for (const product of products ?? []) {
      const parsed = parseSupabaseStorageUrl(product.image_url);
      if (parsed?.bucket) return parsed.bucket;
    }
  }

  const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
  if (bucketError) throw bucketError;

  const preferredNames = [
    "product-images",
    "products",
    "productos",
    "imagenes-productos",
    "product_images",
    "images",
    "imagenes",
  ];

  for (const name of preferredNames) {
    const match = (buckets ?? []).find((bucket) => bucket.name === name);
    if (match) return match.name;
  }

  if ((buckets ?? []).length === 1) {
    return buckets![0].name;
  }

  throw new Error(
    "No pude identificar automáticamente el bucket de imágenes. Configura SUPABASE_PRODUCT_IMAGES_BUCKET con el nombre del bucket que ya usas en Supabase Storage."
  );
}

export async function removeStorageImageIfUnused(
  imageUrl: string | null | undefined,
  productId: number
) {
  const parsed = parseSupabaseStorageUrl(imageUrl);
  if (!parsed) return;

  const { data: otherReference, error: referenceError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("image_url", imageUrl)
    .neq("id", productId)
    .limit(1)
    .maybeSingle();

  if (referenceError) {
    console.warn("No se pudo comprobar si la imagen anterior seguía en uso:", referenceError);
    return;
  }

  if (otherReference) return;

  const { error: removeError } = await supabaseAdmin.storage
    .from(parsed.bucket)
    .remove([parsed.path]);

  if (removeError) {
    console.warn("No se pudo borrar la imagen anterior de Storage:", removeError);
  }
}
