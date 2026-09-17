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

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("customer_consents")
      .select("marketing_opt_in,marketing_opt_in_at,marketing_opt_out_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const enabled = data
      ? data.marketing_opt_in === true
      : user.user_metadata?.marketing_opt_in === true;

    return NextResponse.json({
      enabled,
      optedInAt: data?.marketing_opt_in_at ?? null,
      optedOutAt: data?.marketing_opt_out_at ?? null,
    });
  } catch (error) {
    console.error("ERROR LEYENDO PREFERENCIAS DE MARKETING:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar tus preferencias." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }

    const body = (await request.json()) as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Preferencia inválida." },
        { status: 400 }
      );
    }

    const enabled = body.enabled;
    const now = new Date().toISOString();
    const metadata = user.user_metadata ?? {};
    const email = cleanText(user.email, 254).toLowerCase();
    const phone = normalizePhone(metadata.phone);

    const { data: existingConsent, error: existingConsentError } = await supabaseAdmin
      .from("customer_consents")
      .select(
        "terms_version,terms_accepted_at,privacy_version,privacy_acknowledged_at,marketing_opt_in_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingConsentError) throw existingConsentError;

    if (existingConsent) {
      const { error: updateConsentError } = await supabaseAdmin
        .from("customer_consents")
        .update({
          marketing_opt_in: enabled,
          marketing_opt_in_at: enabled
            ? existingConsent.marketing_opt_in_at ?? now
            : null,
          marketing_opt_out_at: enabled ? null : now,
          updated_at: now,
        })
        .eq("user_id", user.id);

      if (updateConsentError) throw updateConsentError;
    } else {
      const termsVersion = cleanText(metadata.terms_version, 40);
      const termsAcceptedAt = cleanText(metadata.terms_accepted_at, 60);
      const privacyVersion = cleanText(metadata.privacy_version, 40);
      const privacyAcknowledgedAt = cleanText(
        metadata.privacy_acknowledged_at,
        60
      );

      if (
        termsVersion &&
        termsAcceptedAt &&
        privacyVersion &&
        privacyAcknowledgedAt
      ) {
        const { error: insertConsentError } = await supabaseAdmin
          .from("customer_consents")
          .insert({
            user_id: user.id,
            terms_version: termsVersion,
            terms_accepted_at: termsAcceptedAt,
            privacy_version: privacyVersion,
            privacy_acknowledged_at: privacyAcknowledgedAt,
            marketing_opt_in: enabled,
            marketing_opt_in_at: enabled ? now : null,
            marketing_opt_out_at: enabled ? null : now,
            updated_at: now,
          });

        if (insertConsentError) throw insertConsentError;
      }
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...metadata,
          marketing_opt_in: enabled,
          marketing_opt_in_at: enabled ? now : null,
        },
      }
    );

    if (authError) throw authError;

    if (enabled) {
      const rows: Array<Record<string, unknown>> = [];

      if (email) {
        rows.push({
          user_id: user.id,
          channel: "email",
          destination: email,
          status: "subscribed",
          consented_at: now,
          revoked_at: null,
          source: "account_preferences",
          updated_at: now,
        });
      }

      if (phone) {
        rows.push({
          user_id: user.id,
          channel: "whatsapp",
          destination: phone,
          status: "subscribed",
          consented_at: now,
          revoked_at: null,
          source: "account_preferences",
          updated_at: now,
        });
      }

      if (rows.length > 0) {
        const { error: subscribeError } = await supabaseAdmin
          .from("marketing_subscriptions")
          .upsert(rows, { onConflict: "channel,destination" });

        if (subscribeError) throw subscribeError;
      }
    } else {
      const revoke = {
        status: "unsubscribed",
        revoked_at: now,
        updated_at: now,
      };

      const { error: revokeUserError } = await supabaseAdmin
        .from("marketing_subscriptions")
        .update(revoke)
        .eq("user_id", user.id);

      if (revokeUserError) throw revokeUserError;

      if (email) {
        const { error: revokeEmailError } = await supabaseAdmin
          .from("marketing_subscriptions")
          .update(revoke)
          .eq("channel", "email")
          .eq("destination", email);
        if (revokeEmailError) throw revokeEmailError;
      }

      if (phone) {
        const { error: revokePhoneError } = await supabaseAdmin
          .from("marketing_subscriptions")
          .update(revoke)
          .eq("channel", "whatsapp")
          .eq("destination", phone);
        if (revokePhoneError) throw revokePhoneError;
      }
    }

    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO PREFERENCIAS DE MARKETING:", error);
    return NextResponse.json(
      { error: "No se pudieron guardar tus preferencias." },
      { status: 500 }
    );
  }
}
