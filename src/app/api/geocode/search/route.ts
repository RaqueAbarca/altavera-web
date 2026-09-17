import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  consumeRateLimit,
  getClientFingerprint,
  hashRateLimitValue,
} from "@/lib/rateLimit.server";

export const runtime = "nodejs";

type NominatimResult = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  address?: Record<string, string | undefined>;
};

type PublicGeocodeResult = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  category: string | null;
  type: string | null;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanQuery(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function cacheKeyFor(query: string) {
  return `cr-alajuela-v1:${hashRateLimitValue(query)}`;
}

function isPublicGeocodeResult(value: unknown): value is PublicGeocodeResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.displayName === "string" &&
    Number.isFinite(Number(row.latitude)) &&
    Number.isFinite(Number(row.longitude))
  );
}

function transformResults(rows: NominatimResult[]): PublicGeocodeResult[] {
  return rows
    .map((row) => {
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);
      const displayName = String(row.display_name ?? "").trim();

      if (
        !displayName ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return null;
      }

      return {
        id: String(row.place_id ?? `${latitude},${longitude}`),
        displayName,
        latitude,
        longitude,
        category: row.category ? String(row.category) : null,
        type: row.type ? String(row.type) : null,
      } satisfies PublicGeocodeResult;
    })
    .filter((row): row is PublicGeocodeResult => row !== null)
    .slice(0, 5);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = cleanQuery(url.searchParams.get("q"));

    if (query.length < 3) {
      return NextResponse.json(
        { error: "Escribe al menos 3 caracteres para buscar un lugar." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const fingerprint = getClientFingerprint(request);
    const userLimit = await consumeRateLimit({
      key: `geocode:ip:${fingerprint}`,
      limit: 12,
      windowSeconds: 5 * 60,
    });

    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Has realizado muchas búsquedas seguidas. Espera unos minutos e inténtalo nuevamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(userLimit.retryAfterSeconds || 60),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const cacheKey = cacheKeyFor(query);
    const nowIso = new Date().toISOString();
    const { data: cached, error: cacheError } = await supabaseAdmin
      .from("geocoding_cache")
      .select("results,expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (!cacheError && cached && Array.isArray(cached.results)) {
      const results = cached.results.filter(isPublicGeocodeResult);
      return NextResponse.json(
        { results, cached: true },
        {
          headers: {
            "Cache-Control": "private, max-age=300",
          },
        }
      );
    }

    if (cacheError) {
      console.error("ERROR LEYENDO CACHÉ DE GEOCODIFICACIÓN:", cacheError);
    }

    // La API pública de Nominatim exige un máximo absoluto de 1 req/s por app.
    const globalLimit = await consumeRateLimit({
      key: "geocode:nominatim:global",
      limit: 1,
      windowSeconds: 1,
    });

    if (!globalLimit.configured) {
      return NextResponse.json(
        { error: "El buscador todavía no está habilitado. Falta aplicar la migración de protección anti-spam." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!globalLimit.allowed) {
      return NextResponse.json(
        { error: "El buscador está ocupado. Espera un segundo y vuelve a intentar." },
        {
          status: 429,
          headers: {
            "Retry-After": String(globalLimit.retryAfterSeconds || 1),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const geocodingBaseUrl = String(
      process.env.ALTAVERA_GEOCODING_URL ??
        "https://nominatim.openstreetmap.org/search"
    ).trim();
    const endpoint = new URL(geocodingBaseUrl);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("addressdetails", "1");
    endpoint.searchParams.set("countrycodes", "cr");
    endpoint.searchParams.set("limit", "5");
    endpoint.searchParams.set("accept-language", "es");
    // Prioriza Alajuela sin impedir resultados válidos en el resto de Costa Rica.
    endpoint.searchParams.set("viewbox", "-84.38,10.16,-84.08,9.86");
    endpoint.searchParams.set("bounded", "0");

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Altavera/1.0 (https://www.altaveraenlinea.com/)",
        Referer: "https://www.altaveraenlinea.com/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Nominatim respondió ${response.status}`);
    }

    const raw = (await response.json()) as NominatimResult[];
    const results = transformResults(Array.isArray(raw) ? raw : []);
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    const { error: saveCacheError } = await supabaseAdmin
      .from("geocoding_cache")
      .upsert(
        {
          cache_key: cacheKey,
          results,
          expires_at: expiresAt,
          updated_at: nowIso,
        },
        { onConflict: "cache_key" }
      );

    if (saveCacheError) {
      console.error("ERROR GUARDANDO CACHÉ DE GEOCODIFICACIÓN:", saveCacheError);
    }

    return NextResponse.json(
      { results, cached: false },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch (error) {
    console.error("ERROR BUSCANDO LUGAR:", error);
    return NextResponse.json(
      { error: "No pudimos buscar ese lugar en este momento. Puedes marcarlo manualmente en el mapa." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
