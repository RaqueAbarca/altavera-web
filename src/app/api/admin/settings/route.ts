import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import type { DeliveryScheduleRule } from "@/lib/appSettings";
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


function hasOwn(object: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseDeliverySchedule(value: unknown): DeliveryScheduleRule[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Selecciona al menos un día de entrega.");
  }

  const schedule: DeliveryScheduleRule[] = [];
  const seen = new Set<number>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Hay una regla de entrega inválida.");
    }

    const source = item as Record<string, unknown>;
    const deliveryWeekday = Number(source.deliveryWeekday);
    const cutoffWeekday = Number(source.cutoffWeekday);
    const cutoffTime = text(source.cutoffTime, 5);

    if (
      !Number.isInteger(deliveryWeekday) ||
      deliveryWeekday < 0 ||
      deliveryWeekday > 6 ||
      !Number.isInteger(cutoffWeekday) ||
      cutoffWeekday < 0 ||
      cutoffWeekday > 6 ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)
    ) {
      throw new Error(
        "Revisa el día y la hora de corte de cada día de entrega."
      );
    }

    if (seen.has(deliveryWeekday)) {
      throw new Error("Cada día de entrega solo puede configurarse una vez.");
    }

    seen.add(deliveryWeekday);
    schedule.push({ deliveryWeekday, cutoffWeekday, cutoffTime });
  }

  return schedule;
}

function serializeDeliverySchedule(schedule: DeliveryScheduleRule[]) {
  return schedule.map((rule) => ({
    delivery_weekday: rule.deliveryWeekday,
    cutoff_weekday: rule.cutoffWeekday,
    cutoff_time: rule.cutoffTime,
  }));
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
    const body = (await request.json()) as Record<string, unknown>;
    const current = await getRawAppSettings();
    const currentDelivery = current?.delivery_pricing ?? {};
    const currentPayment = current?.payment_settings ?? {};
    const currentContact = current?.contact_settings ?? {};

    const nextDelivery = { ...currentDelivery };
    const nextPayment = { ...currentPayment };
    const nextContact = { ...currentContact };
    let deliveryScheduleChanged = false;

    if (hasOwn(body, "deliveryFlatFeeCrc")) {
      nextDelivery.mode = "flat";
      nextDelivery.flat_fee_crc = parseFee(body.deliveryFlatFeeCrc);
    }

    if (hasOwn(body, "deliverySchedule")) {
      const schedule = parseDeliverySchedule(body.deliverySchedule);
      nextDelivery.delivery_schedule = serializeDeliverySchedule(schedule);
      deliveryScheduleChanged = true;
    }

    if (hasOwn(body, "sinpePhone")) {
      nextPayment.sinpe_phone = text(body.sinpePhone, 40);
    }

    if (hasOwn(body, "sinpeHolder")) {
      nextPayment.sinpe_holder = text(body.sinpeHolder);
    }

    if (hasOwn(body, "bankAccounts")) {
      const bankAccounts = parseBankAccounts(body.bankAccounts);
      const firstBankAccount = bankAccounts[0] ?? {
        bank_name: "",
        account_holder: "",
        account_number: "",
        iban: "",
      };

      nextPayment.bank_accounts = bankAccounts;
      // Conservamos también la primera cuenta en las claves antiguas para
      // mantener compatibilidad con cualquier despliegue previo.
      nextPayment.bank_name = firstBankAccount.bank_name;
      nextPayment.bank_account_holder = firstBankAccount.account_holder;
      nextPayment.bank_account_number = firstBankAccount.account_number;
      nextPayment.bank_iban = firstBankAccount.iban;
    }

    if (hasOwn(body, "whatsappPhone")) {
      nextContact.whatsapp_phone = text(body.whatsappPhone, 40);
    }

    if (hasOwn(body, "contactEmail")) {
      nextContact.email = text(body.contactEmail, 180);
    }

    const payload = {
      id: APP_SETTINGS_ID,
      delivery_pricing: nextDelivery,
      payment_settings: nextPayment,
      contact_settings: nextContact,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    if (deliveryScheduleChanged) {
      await syncDeliveryCycles();
    }

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
