import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    };
  }

  const {
    data: isAdmin,
    error: adminError
  } = await supabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    };
  }

  return {
    ok: true as const,
    user,
    supabase
  };
}