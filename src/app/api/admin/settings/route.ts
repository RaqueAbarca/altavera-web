import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import type {
  DeliveryDistanceSettings,
  DeliveryFeeMode,
  DeliveryScheduleRule,
  DeliveryVehicleSettings,
  FuelPriceSettings,
  FuelType,
} from "@/lib/appSettings";
import {
  APP_SETTINGS_ID,
  getAdminAppSettings,
  getRawAppSettings,
  isDistanceDeliveryConfigured,
} from "@/lib/appSettings.server";

export const runtime = "nodejs";

function text(value: unknown, maxLength = 180) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function hasOwn(object: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseNullableNumber(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; positive?: boolean } = {}
) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} debe ser un número válido.`);
  if (options.positive && parsed <= 0) throw new Error(`${label} debe ser mayor que 0.`);
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${label} debe ser mayor o igual a ${options.min}.`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} debe ser menor o igual a ${options.max}.`);
  }
  return parsed;
}

function parseFee(value: unknown) {
  const parsed = parseNullableNumber(value, "La tarifa de envío", { min: 0, max: 1_000_000 });
  return parsed === null ? null : Math.round(parsed);
}

function parseMode(value: unknown): DeliveryFeeMode {
  if (value === "flat" || value === "distance") return value;
  throw new Error("El modo de cálculo de envío no es válido.");
}

function parseFuelType(value: unknown): FuelType {
  if (value === "super" || value === "regular" || value === "diesel") return value;
  throw new Error("El tipo de combustible del vehículo no es válido.");
}

function parseBankAccounts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 2).map((account) => {
    const source = account && typeof account === "object"
      ? account as Record<string, unknown>
      : {};
    return {
      bank_name: text(source.bankName),
      account_holder: text(source.accountHolder),
      account_number: text(source.accountNumber, 80),
      iban: text(source.iban, 80),
    };
  });
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
      throw new Error("Revisa el día y la hora de corte de cada día de entrega.");
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

function parseFuelPrices(value: unknown): FuelPriceSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    super: parseNullableNumber(source.super, "El precio de gasolina Súper", { min: 0, max: 100_000 }),
    regular: parseNullableNumber(source.regular, "El precio de gasolina Regular", { min: 0, max: 100_000 }),
    diesel: parseNullableNumber(source.diesel, "El precio de diésel", { min: 0, max: 100_000 }),
  };
}

function parseVehicles(value: unknown): DeliveryVehicleSettings[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Agrega al menos un vehículo para el cálculo de entregas.");
  }

  const vehicles = value.slice(0, 8).map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Hay un vehículo inválido en la configuración.");
    }
    const source = item as Record<string, unknown>;
    const name = text(source.name, 80);
    if (!name) throw new Error(`Escribe el nombre del vehículo ${index + 1}.`);

    return {
      id: text(source.id, 80) || `vehicle-${index + 1}`,
      name,
      fuelType: parseFuelType(source.fuelType),
      consumptionLPer100Km: parseNullableNumber(
        source.consumptionLPer100Km,
        `El consumo de ${name}`,
        { positive: true, max: 100 }
      ),
      maintenanceCrcPerKm: parseNullableNumber(
        source.maintenanceCrcPerKm,
        `El mantenimiento por km de ${name}`,
        { min: 0, max: 1_000_000 }
      ),
      active: Boolean(source.active),
    } satisfies DeliveryVehicleSettings;
  });

  const activeIndex = vehicles.findIndex((vehicle) => vehicle.active);
  return vehicles.map((vehicle, index) => ({
    ...vehicle,
    active: index === (activeIndex >= 0 ? activeIndex : 0),
  }));
}

function parseDistanceSettings(value: unknown): DeliveryDistanceSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La configuración de costos de entrega no es válida.");
  }

  const source = value as Record<string, unknown>;
  return {
    originLatitude: parseNullableNumber(source.originLatitude, "La latitud del punto de salida", { min: -90, max: 90 }),
    originLongitude: parseNullableNumber(source.originLongitude, "La longitud del punto de salida", { min: -180, max: 180 }),
    fuelPricesCrcPerLiter: parseFuelPrices(source.fuelPricesCrcPerLiter),
    laborRateCrcPerHour: parseNullableNumber(source.laborRateCrcPerHour, "El pago por hora", { min: 0, max: 1_000_000 }),
    stopMinutes: parseNullableNumber(source.stopMinutes, "Los minutos por parada", { min: 0, max: 240 }),
    marginPercent: parseNullableNumber(source.marginPercent, "El margen del envío", { min: 0, max: 500 }) ?? 0,
    roundingCrc: parseNullableNumber(source.roundingCrc, "El redondeo del envío", { positive: true, max: 100_000 }) ?? 100,
    minimumShippingCrc: parseNullableNumber(source.minimumShippingCrc, "El envío mínimo", { min: 0, max: 1_000_000 }) ?? 1500,
    vehicles: parseVehicles(source.vehicles),
  };
}

function serializeDistanceSettings(settings: DeliveryDistanceSettings) {
  return {
    origin_latitude: settings.originLatitude,
    origin_longitude: settings.originLongitude,
    fuel_prices_crc_per_liter: settings.fuelPricesCrcPerLiter,
    labor_rate_crc_per_hour: settings.laborRateCrcPerHour,
    stop_minutes: settings.stopMinutes,
    margin_percent: settings.marginPercent,
    rounding_crc: settings.roundingCrc,
    minimum_shipping_crc: settings.minimumShippingCrc,
    vehicles: settings.vehicles.map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.name,
      fuel_type: vehicle.fuelType,
      consumption_l_per_100km: vehicle.consumptionLPer100Km,
      maintenance_crc_per_km: vehicle.maintenanceCrcPerKm,
      active: vehicle.active,
    })),
  };
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

    if (hasOwn(body, "deliveryMode")) {
      nextDelivery.mode = parseMode(body.deliveryMode);
    }

    if (hasOwn(body, "deliveryFlatFeeCrc")) {
      nextDelivery.flat_fee_crc = parseFee(body.deliveryFlatFeeCrc);
    }

    if (hasOwn(body, "deliveryDistance")) {
      const distanceSettings = parseDistanceSettings(body.deliveryDistance);
      nextDelivery.distance_pricing = serializeDistanceSettings(distanceSettings);

      const requestedMode = hasOwn(body, "deliveryMode")
        ? parseMode(body.deliveryMode)
        : (nextDelivery.mode === "distance" ? "distance" : "flat");

      if (requestedMode === "distance" && !isDistanceDeliveryConfigured(distanceSettings)) {
        throw new Error(
          "Para activar el envío calculado completa el punto de salida, combustible del vehículo activo, consumo, mantenimiento por km, pago por hora y minutos por parada, y configura OpenRouteService."
        );
      }
    }

    const deliveryPricingTouched =
      hasOwn(body, "deliveryMode") ||
      hasOwn(body, "deliveryFlatFeeCrc") ||
      hasOwn(body, "deliveryDistance");

    if (deliveryPricingTouched && nextDelivery.mode === "flat" && nextDelivery.flat_fee_crc == null) {
      throw new Error("Define una tarifa fija antes de guardar el modo de tarifa fija.");
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
        error: error instanceof Error ? error.message : "No se pudo guardar la configuración",
      },
      { status: 400 }
    );
  }
}
