import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizePhone(value: unknown) {
  const digits = cleanText(value, 30).replace(/\D/g, "");
  if (digits.length === 8) return digits;
  if (digits.startsWith("506") && digits.length === 11) return digits.slice(3);
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const metadata = user.user_metadata ?? {};
  const now = new Date().toISOString();
  const marketingOptIn = metadata.marketing_opt_in === true;
  const termsVersion = cleanText(metadata.terms_version, 40);
  const termsAcceptedAt = cleanText(metadata.terms_accepted_at, 60);
  const privacyVersion = cleanText(metadata.privacy_version, 40);
  const privacyAcknowledgedAt = cleanText(
    metadata.privacy_acknowledged_at,
    60
  );

  // Solo copiamos el consentimiento legal cuando existe evidencia real en los
  // metadatos de registro. Nunca fabricamos una fecha de aceptación.
  if (
    termsVersion &&
    termsAcceptedAt &&
    privacyVersion &&
    privacyAcknowledgedAt
  ) {
    const { error: consentError } = await supabaseAdmin
      .from("customer_consents")
      .upsert(
        {
          user_id: user.id,
          terms_version: termsVersion,
          terms_accepted_at: termsAcceptedAt,
          privacy_version: privacyVersion,
          privacy_acknowledged_at: privacyAcknowledgedAt,
          marketing_opt_in: marketingOptIn,
          marketing_opt_in_at: marketingOptIn
            ? cleanText(metadata.marketing_opt_in_at, 60) || termsAcceptedAt
            : null,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (consentError) {
      console.error("ERROR SINCRONIZANDO CONSENTIMIENTO DE CUENTA:", consentError);
      return NextResponse.json(
        { error: "No se pudo sincronizar el consentimiento de la cuenta." },
        { status: 500 }
      );
    }
  }

  if (!marketingOptIn) {
    return NextResponse.json({ ok: true, marketing: "not_subscribed" });
  }

  const email = cleanText(user.email, 254).toLowerCase();
  const phone = normalizePhone(metadata.phone);
  const consentedAt = cleanText(metadata.marketing_opt_in_at, 60) || now;
  const rows: Array<{
    user_id: string;
    channel: "email" | "whatsapp";
    destination: string;
    status: "subscribed";
    consented_at: string;
    revoked_at: null;
    source: string;
    updated_at: string;
  }> = [];

  if (email) {
    rows.push({
      user_id: user.id,
      channel: "email",
      destination: email,
      status: "subscribed",
      consented_at: consentedAt,
      revoked_at: null,
      source: "account_signup",
      updated_at: now,
    });
  }

  if (phone) {
    rows.push({
      user_id: user.id,
      channel: "whatsapp",
      destination: phone,
      status: "subscribed",
      consented_at: consentedAt,
      revoked_at: null,
      source: "account_signup",
      updated_at: now,
    });
  }

  if (rows.length > 0) {
    const { error: marketingError } = await supabaseAdmin
      .from("marketing_subscriptions")
      .upsert(rows, { onConflict: "channel,destination" });

    if (marketingError) {
      console.error("ERROR SINCRONIZANDO MARKETING DE CUENTA:", marketingError);
      return NextResponse.json(
        { error: "No se pudo sincronizar la suscripción de marketing." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, marketing: "subscribed" });
}
