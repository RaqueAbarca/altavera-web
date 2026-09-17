import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_PENDING_AGE_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const editToken = typeof body?.editToken === "string" ? body.editToken.trim() : "";

    if (!userId || !email || !editToken) {
      return NextResponse.json({ error: "Faltan datos para corregir el registro." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return NextResponse.json({ error: "El registro pendiente ya no existe." }, { status: 404 });
    }

    const user = data.user;
    const createdAt = new Date(user.created_at).getTime();
    const isRecent = Number.isFinite(createdAt) && Date.now() - createdAt <= MAX_PENDING_AGE_MS;
    const storedEditToken = user.user_metadata?.registration_edit_token;

    if (user.email?.toLowerCase() !== email || storedEditToken !== editToken) {
      return NextResponse.json({ error: "No pudimos validar este registro pendiente." }, { status: 403 });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Esta cuenta ya fue confirmada. Inicia sesión para editar tus datos." },
        { status: 409 }
      );
    }

    if (!isRecent) {
      return NextResponse.json(
        { error: "Este registro pendiente es demasiado antiguo. Vuelve a cargar la página e inténtalo nuevamente." },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("delete-unconfirmed-registration:", deleteError);
      return NextResponse.json({ error: "No pudimos reemplazar el registro pendiente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete-unconfirmed-registration:", error);
    return NextResponse.json({ error: "No pudimos procesar la corrección del registro." }, { status: 500 });
  }
}
