import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getOpenRouteServiceRoundTrip,
  isOpenRouteServiceConfigured,
} from "@/lib/routing/openRouteService.server";
import {
  EMPTY_BANK_ACCOUNT,
  EMPTY_DELIVERY_DISTANCE_SETTINGS,
  EMPTY_PUBLIC_APP_SETTINGS,
  type AdminAppSettings,
  type BankAccountSettings,
  type DeliveryDistanceSettings,
  type DeliveryFeeMode,
  type DeliveryQuote,
  type DeliveryScheduleRule,
  type DeliveryVehicleSettings,
  type FuelPriceSettings,
  type FuelType,
  type PublicAppSettings,
} from "@/lib/appSettings";

export const APP_SETTINGS_ID = "main";

const MAX_BANK_ACCOUNTS = 2;
const MAX_DELIVERY_VEHICLES = 8;

export type AppSettingsRow = {
  id: string;
  delivery_pricing: Record<string, unknown> | null;
  payment_settings: Record<string, unknown> | null;
  contact_settings: Record<string, unknown> | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function nullablePositiveNumber(value: unknown) {
  const parsed = nullableNonNegativeNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function nullableCoordinate(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function hasOwn(object: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function deliveryMode(value: unknown): DeliveryFeeMode {
  return value === "distance" ? "distance" : "flat";
}

function fuelType(value: unknown): FuelType {
  return value === "regular" || value === "diesel" ? value : "super";
}

function isWeekday(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isCutoffTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseDeliverySchedule(value: unknown): DeliveryScheduleRule[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const schedule: DeliveryScheduleRule[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const source = item as Record<string, unknown>;
    const deliveryWeekday = Number(source.delivery_weekday ?? source.deliveryWeekday);
    const cutoffWeekday = Number(source.cutoff_weekday ?? source.cutoffWeekday);
    const cutoffTime = cleanString(source.cutoff_time ?? source.cutoffTime);

    if (
      !isWeekday(deliveryWeekday) ||
      !isWeekday(cutoffWeekday) ||
      !isCutoffTime(cutoffTime) ||
      seen.has(deliveryWeekday)
    ) {
      continue;
    }

    seen.add(deliveryWeekday);
    schedule.push({ deliveryWeekday, cutoffWeekday, cutoffTime });
  }

  return schedule;
}

function cleanBankAccount(value: unknown): BankAccountSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_BANK_ACCOUNT };
  }

  const account = value as Record<string, unknown>;
  return {
    bankName: cleanString(account.bank_name ?? account.bankName),
    accountHolder: cleanString(
      account.account_holder ?? account.bank_account_holder ?? account.accountHolder
    ),
    accountNumber: cleanString(account.account_number ?? account.accountNumber),
    iban: cleanString(account.iban ?? account.bank_iban),
  };
}

function hasBankAccountData(account: BankAccountSettings) {
  return Boolean(account.bankName || account.accountHolder || account.accountNumber || account.iban);
}

function bankAccountsFromPayment(payment: Record<string, unknown>) {
  if (Array.isArray(payment.bank_accounts)) {
    const accounts = payment.bank_accounts
      .slice(0, MAX_BANK_ACCOUNTS)
      .map(cleanBankAccount)
      .filter(hasBankAccountData);

    if (accounts.length > 0) return accounts;
  }

  const legacyAccount: BankAccountSettings = {
    bankName: cleanString(payment.bank_name),
    accountHolder: cleanString(payment.bank_account_holder ?? payment.bank_holder),
    accountNumber: cleanString(payment.bank_account_number),
    iban: cleanString(payment.bank_iban),
  };

  return hasBankAccountData(legacyAccount) ? [legacyAccount] : [];
}

function parseFuelPrices(value: unknown): FuelPriceSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    super: hasOwn(source, "super")
      ? nullableNonNegativeNumber(source.super)
      : EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter.super,
    regular: hasOwn(source, "regular")
      ? nullableNonNegativeNumber(source.regular)
      : EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter.regular,
    diesel: hasOwn(source, "diesel")
      ? nullableNonNegativeNumber(source.diesel)
      : EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter.diesel,
  };
}

function parseVehicles(value: unknown): DeliveryVehicleSettings[] {
  if (!Array.isArray(value) || value.length === 0) {
    return EMPTY_DELIVERY_DISTANCE_SETTINGS.vehicles.map((vehicle) => ({ ...vehicle }));
  }

  const parsed = value
    .slice(0, MAX_DELIVERY_VEHICLES)
    .flatMap((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const source = item as Record<string, unknown>;
      const id = cleanString(source.id) || `vehicle-${index + 1}`;
      const name = cleanString(source.name) || `Vehículo ${index + 1}`;
      return [{
        id,
        name,
        fuelType: fuelType(source.fuel_type ?? source.fuelType),
        consumptionLPer100Km: nullablePositiveNumber(
          source.consumption_l_per_100km ?? source.consumptionLPer100Km
        ),
        maintenanceCrcPerKm: nullableNonNegativeNumber(
          source.maintenance_crc_per_km ?? source.maintenanceCrcPerKm
        ),
        active: Boolean(source.active),
      } satisfies DeliveryVehicleSettings];
    });

  if (parsed.length === 0) {
    return EMPTY_DELIVERY_DISTANCE_SETTINGS.vehicles.map((vehicle) => ({ ...vehicle }));
  }

  const activeIndex = parsed.findIndex((vehicle) => vehicle.active);
  return parsed.map((vehicle, index) => ({
    ...vehicle,
    active: index === (activeIndex >= 0 ? activeIndex : 0),
  }));
}

export function parseDeliveryDistanceSettings(value: unknown): DeliveryDistanceSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    originLatitude: nullableCoordinate(
      source.origin_latitude ?? source.originLatitude,
      -90,
      90
    ),
    originLongitude: nullableCoordinate(
      source.origin_longitude ?? source.originLongitude,
      -180,
      180
    ),
    fuelPricesCrcPerLiter: parseFuelPrices(
      source.fuel_prices_crc_per_liter ?? source.fuelPricesCrcPerLiter
    ),
    laborRateCrcPerHour: nullableNonNegativeNumber(
      source.labor_rate_crc_per_hour ?? source.laborRateCrcPerHour
    ) ?? EMPTY_DELIVERY_DISTANCE_SETTINGS.laborRateCrcPerHour,
    stopMinutes: nullableNonNegativeNumber(source.stop_minutes ?? source.stopMinutes),
    marginPercent: nullableNonNegativeNumber(source.margin_percent ?? source.marginPercent)
      ?? EMPTY_DELIVERY_DISTANCE_SETTINGS.marginPercent,
    roundingCrc: nullablePositiveNumber(source.rounding_crc ?? source.roundingCrc)
      ?? EMPTY_DELIVERY_DISTANCE_SETTINGS.roundingCrc,
    minimumShippingCrc: nullableNonNegativeNumber(source.minimum_shipping_crc ?? source.minimumShippingCrc)
      ?? EMPTY_DELIVERY_DISTANCE_SETTINGS.minimumShippingCrc,
    vehicles: parseVehicles(source.vehicles),
  };
}

function coordinatesAreValid(settings: DeliveryDistanceSettings) {
  return settings.originLatitude !== null &&
    settings.originLatitude >= -90 && settings.originLatitude <= 90 &&
    settings.originLongitude !== null &&
    settings.originLongitude >= -180 && settings.originLongitude <= 180;
}

export function isDistanceDeliveryConfigured(settings: DeliveryDistanceSettings) {
  const vehicle = settings.vehicles.find((item) => item.active);
  if (!vehicle || !coordinatesAreValid(settings)) return false;
  const fuelPrice = settings.fuelPricesCrcPerLiter[vehicle.fuelType];
  return Boolean(
    isOpenRouteServiceConfigured() &&
    vehicle.consumptionLPer100Km !== null && vehicle.consumptionLPer100Km > 0 &&
    vehicle.maintenanceCrcPerKm !== null && vehicle.maintenanceCrcPerKm >= 0 &&
    fuelPrice !== null && fuelPrice > 0 &&
    settings.laborRateCrcPerHour !== null && settings.laborRateCrcPerHour >= 0 &&
    settings.stopMinutes !== null && settings.stopMinutes >= 0 &&
    settings.marginPercent >= 0 &&
    settings.roundingCrc > 0 &&
    settings.minimumShippingCrc >= 0
  );
}

export async function getRawAppSettings(): Promise<AppSettingsRow | null> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("id, delivery_pricing, payment_settings, contact_settings, updated_at, updated_by")
    .eq("id", APP_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return (data as AppSettingsRow | null) ?? null;
}

export function mapPublicAppSettings(row: AppSettingsRow | null): PublicAppSettings {
  if (!row) return EMPTY_PUBLIC_APP_SETTINGS;

  const delivery = row.delivery_pricing ?? {};
  const payment = row.payment_settings ?? {};
  const contact = row.contact_settings ?? {};
  const mode = deliveryMode(delivery.mode);
  const flatFeeCrc = nullableNonNegativeNumber(delivery.flat_fee_crc);
  const distanceSettings = parseDeliveryDistanceSettings(delivery.distance_pricing);

  return {
    delivery: {
      mode,
      flatFeeCrc: mode === "flat" ? flatFeeCrc : null,
      configured:
        mode === "flat"
          ? flatFeeCrc !== null
          : isDistanceDeliveryConfigured(distanceSettings),
    },
    payment: {
      sinpePhone: cleanString(payment.sinpe_phone),
      sinpeHolder: cleanString(payment.sinpe_holder),
      bankAccounts: bankAccountsFromPayment(payment),
    },
    contact: {
      whatsappPhone: cleanString(contact.whatsapp_phone),
      email: cleanString(contact.email),
    },
  };
}

export async function getPublicAppSettings() {
  return mapPublicAppSettings(await getRawAppSettings());
}

export async function getAdminAppSettings(): Promise<AdminAppSettings> {
  const row = await getRawAppSettings();
  const settings = mapPublicAppSettings(row);
  const deliverySchedule = parseDeliverySchedule(row?.delivery_pricing?.delivery_schedule);
  const bankAccounts = settings.payment.bankAccounts.slice(0, MAX_BANK_ACCOUNTS);

  while (bankAccounts.length < MAX_BANK_ACCOUNTS) {
    bankAccounts.push({ ...EMPTY_BANK_ACCOUNT });
  }

  return {
    deliveryMode: deliveryMode(row?.delivery_pricing?.mode),
    deliveryFlatFeeCrc: nullableNonNegativeNumber(row?.delivery_pricing?.flat_fee_crc),
    deliveryDistance: parseDeliveryDistanceSettings(row?.delivery_pricing?.distance_pricing),
    deliverySchedule,
    deliveryScheduleConfigured: deliverySchedule.length > 0,
    sinpePhone: settings.payment.sinpePhone,
    sinpeHolder: settings.payment.sinpeHolder,
    bankAccounts,
    whatsappPhone: settings.contact.whatsappPhone,
    contactEmail: settings.contact.email,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function ceilTo(value: number, multiple: number) {
  if (value <= 0) return 0;
  return Math.ceil(value / multiple) * multiple;
}

export async function getDeliveryQuoteForOrder(location?: {
  latitude: number;
  longitude: number;
}): Promise<DeliveryQuote> {
  const row = await getRawAppSettings();
  const publicSettings = mapPublicAppSettings(row);

  if (publicSettings.delivery.mode === "flat") {
    const flatFee = publicSettings.delivery.flatFeeCrc;
    if (flatFee === null) {
      throw new Error(
        "La tarifa de envío todavía no está configurada. Configúrala desde Admin → Configuración antes de recibir pedidos."
      );
    }

    return {
      mode: "flat",
      shippingCrc: Math.round(flatFee),
      estimatedCostCrc: null,
      oneWayDistanceKm: null,
      roundTripDistanceKm: null,
      estimatedMinutes: null,
      calculationMethod: "flat",
      snapshot: {
        mode: "flat",
        flat_fee_crc: Math.round(flatFee),
      },
    };
  }

  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error("Selecciona una ubicación válida para calcular el envío.");
  }

  const distance = parseDeliveryDistanceSettings(row?.delivery_pricing?.distance_pricing);
  if (!isDistanceDeliveryConfigured(distance)) {
    throw new Error(
      "El cálculo de envío por distancia todavía no está completamente configurado en Admin → Configuración → Entregas."
    );
  }

  const vehicle = distance.vehicles.find((item) => item.active)!;
  const fuelPrice = distance.fuelPricesCrcPerLiter[vehicle.fuelType]!;
  const origin = {
    latitude: distance.originLatitude!,
    longitude: distance.originLongitude!,
  };

  if (!isOpenRouteServiceConfigured()) {
    throw new Error("El servicio de rutas no está configurado. Intenta de nuevo más tarde.");
  }

  let route;
  try {
    route = await getOpenRouteServiceRoundTrip(origin, location);
  } catch (error) {
    console.error("ERROR OPENROUTESERVICE:", error);
    throw new Error("No pudimos calcular el envío en este momento. Intenta de nuevo.");
  }

  const oneWayDistanceKm = route.oneWayDistanceKm;
  const roundTripDistanceKm = route.roundTripDistanceKm;
  const drivingMinutes = route.drivingMinutes;
  const calculationMethod: DeliveryQuote["calculationMethod"] = "openrouteservice";
  const estimatedMinutes = drivingMinutes + distance.stopMinutes!;
  const fuelCrcPerKm = (vehicle.consumptionLPer100Km! / 100) * fuelPrice;
  const fuelCostCrc = roundTripDistanceKm * fuelCrcPerKm;
  const maintenanceCostCrc = roundTripDistanceKm * vehicle.maintenanceCrcPerKm!;
  const laborCostCrc = (estimatedMinutes / 60) * distance.laborRateCrcPerHour!;
  const estimatedCostCrc = fuelCostCrc + maintenanceCostCrc + laborCostCrc;
  const priceBeforeRounding = estimatedCostCrc * (1 + distance.marginPercent / 100);
  const roundedShippingCrc = ceilTo(priceBeforeRounding, distance.roundingCrc);
  const shippingCrc = Math.max(distance.minimumShippingCrc, roundedShippingCrc);

  return {
    mode: "distance",
    shippingCrc: Math.round(shippingCrc),
    estimatedCostCrc: round2(estimatedCostCrc),
    oneWayDistanceKm: round2(oneWayDistanceKm),
    roundTripDistanceKm: round2(roundTripDistanceKm),
    estimatedMinutes: round2(estimatedMinutes),
    calculationMethod,
    snapshot: {
      mode: "distance",
      calculation_method: calculationMethod,
      origin_latitude: distance.originLatitude,
      origin_longitude: distance.originLongitude,
      destination_latitude: location.latitude,
      destination_longitude: location.longitude,
      one_way_distance_km: round2(oneWayDistanceKm),
      round_trip_distance_km: round2(roundTripDistanceKm),
      driving_minutes: round2(drivingMinutes),
      stop_minutes: distance.stopMinutes,
      estimated_minutes: round2(estimatedMinutes),
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        fuel_type: vehicle.fuelType,
        consumption_l_per_100km: vehicle.consumptionLPer100Km,
        maintenance_crc_per_km: vehicle.maintenanceCrcPerKm,
      },
      fuel_price_crc_per_liter: fuelPrice,
      fuel_crc_per_km: round2(fuelCrcPerKm),
      fuel_cost_crc: round2(fuelCostCrc),
      maintenance_cost_crc: round2(maintenanceCostCrc),
      labor_rate_crc_per_hour: distance.laborRateCrcPerHour,
      labor_cost_crc: round2(laborCostCrc),
      estimated_cost_crc: round2(estimatedCostCrc),
      margin_percent: distance.marginPercent,
      rounding_crc: distance.roundingCrc,
      minimum_shipping_crc: distance.minimumShippingCrc,
      shipping_crc: Math.round(shippingCrc),
    },
  };
}

export async function getDeliveryFeeForOrder(location?: {
  latitude: number;
  longitude: number;
}) {
  const quote = await getDeliveryQuoteForOrder(location);
  return quote.shippingCrc;
}
