import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function requireAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, user: null };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    return { ok: false as const, status: 403, user: null };
  }

  return { ok: true as const, status: 200, user };
}
