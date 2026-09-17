import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const successUrl = new URL("/profile", request.url);
  successUrl.searchParams.set("cuenta_confirmada", "1");

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(successUrl);
    }

    console.error("Error confirmando correo:", error);
  }

  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "confirmacion");
  return NextResponse.redirect(errorUrl);
}
