import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  APP_SETTINGS_ID,
  getAdminAppSettings,
  getRawAppSettings,
} from "@/lib/appSettings.server";

export const runtime = "nodejs";

function text(value: unknown, maxLength = 180) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseFee(value: unknown) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
    throw new Error("La tarifa de envío debe ser un monto válido entre ₡0 y ₡1.000.000.");
  }
  return Math.round(parsed);
}

function parseBankAccounts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 2).map((account) => {
    const source = account && typeof account === "object" ? account as Record<string, unknown> : {};
    return {
      bank_name: text(source.bankName),
      account_holder: text(source.accountHolder),
      account_number: text(source.accountNumber, 80),
      iban: text(source.iban, 80),
    };
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await getAdminAppSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("ERROR LEYENDO CONFIGURACIÓN ADMIN:", error);
    return NextResponse.json(
      {
        error:
          "No se pudo leer la configuración. Verifica que la migración app_settings esté aplicada en Supabase.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const deliveryFlatFeeCrc = parseFee(body.deliveryFlatFeeCrc);
    const bankAccounts = parseBankAccounts(body.bankAccounts);
    const firstBankAccount = bankAccounts[0] ?? {
      bank_name: "",
      account_holder: "",
      account_number: "",
      iban: "",
    };

    const current = await getRawAppSettings();
    const currentDelivery = current?.delivery_pricing ?? {};
    const currentPayment = current?.payment_settings ?? {};
    const currentContact = current?.contact_settings ?? {};

    const payload = {
      id: APP_SETTINGS_ID,
      delivery_pricing: {
        ...currentDelivery,
        mode: "flat",
        flat_fee_crc: deliveryFlatFeeCrc,
      },
      payment_settings: {
        ...currentPayment,
        sinpe_phone: text(body.sinpePhone, 40),
        sinpe_holder: text(body.sinpeHolder),
        bank_accounts: bankAccounts,
        // Conservamos también la primera cuenta en las claves antiguas para
        // mantener compatibilidad con cualquier despliegue previo.
        bank_name: firstBankAccount.bank_name,
        bank_account_holder: firstBankAccount.account_holder,
        bank_account_number: firstBankAccount.account_number,
        bank_iban: firstBankAccount.iban,
      },
      contact_settings: {
        ...currentContact,
        whatsapp_phone: text(body.whatsappPhone, 40),
        email: text(body.contactEmail, 180),
      },
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    return NextResponse.json({ ok: true, ...(await getAdminAppSettings()) });
  } catch (error) {
    console.error("ERROR GUARDANDO CONFIGURACIÓN ADMIN:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la configuración",
      },
      { status: 400 }
    );
  }
}
