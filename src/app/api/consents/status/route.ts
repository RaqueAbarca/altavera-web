import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  hasCurrentLegalConsent,
} from "@/lib/legalConsent";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      legalAccepted: false,
      marketingOptIn: false,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
  }

  const { data: consent, error } = await supabaseAdmin
    .from("customer_consents")
    .select(
      "terms_version,privacy_version,marketing_opt_in,terms_accepted_at,privacy_acknowledged_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("ERROR LEYENDO CONSENTIMIENTOS:", error);
  }

  const metadataTermsVersion =
    typeof user.user_metadata?.terms_version === "string"
      ? user.user_metadata.terms_version
      : null;
  const metadataPrivacyVersion =
    typeof user.user_metadata?.privacy_version === "string"
      ? user.user_metadata.privacy_version
      : null;

  const legalAccepted = hasCurrentLegalConsent({
    termsVersion: consent?.terms_version ?? metadataTermsVersion,
    privacyVersion: consent?.privacy_version ?? metadataPrivacyVersion,
  });

  return NextResponse.json({
    authenticated: true,
    legalAccepted,
    marketingOptIn:
      consent?.marketing_opt_in === true ||
      user.user_metadata?.marketing_opt_in === true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  });
}
