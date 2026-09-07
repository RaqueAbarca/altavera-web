import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  EMPTY_BANK_ACCOUNT,
  EMPTY_PUBLIC_APP_SETTINGS,
  type AdminAppSettings,
  type BankAccountSettings,
  type DeliveryFeeMode,
  type PublicAppSettings,
} from "@/lib/appSettings";

export const APP_SETTINGS_ID = "main";

const MAX_BANK_ACCOUNTS = 2;

type AppSettingsRow = {
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

function deliveryMode(value: unknown): DeliveryFeeMode {
  return value === "distance" ? "distance" : "flat";
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
  return Boolean(
    account.bankName ||
      account.accountHolder ||
      account.accountNumber ||
      account.iban
  );
}

function bankAccountsFromPayment(payment: Record<string, unknown>) {
  if (Array.isArray(payment.bank_accounts)) {
    const accounts = payment.bank_accounts
      .slice(0, MAX_BANK_ACCOUNTS)
      .map(cleanBankAccount)
      .filter(hasBankAccountData);

    if (accounts.length > 0) return accounts;
  }

  // Compatibilidad con la configuración anterior, que guardaba una sola cuenta.
  const legacyAccount: BankAccountSettings = {
    bankName: cleanString(payment.bank_name),
    accountHolder: cleanString(
      payment.bank_account_holder ?? payment.bank_holder
    ),
    accountNumber: cleanString(payment.bank_account_number),
    iban: cleanString(payment.bank_iban),
  };

  return hasBankAccountData(legacyAccount) ? [legacyAccount] : [];
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

  return {
    delivery: {
      mode,
      flatFeeCrc,
      configured: mode === "flat" && flatFeeCrc !== null,
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
  const settings = await getPublicAppSettings();
  const bankAccounts = settings.payment.bankAccounts.slice(0, MAX_BANK_ACCOUNTS);

  while (bankAccounts.length < MAX_BANK_ACCOUNTS) {
    bankAccounts.push({ ...EMPTY_BANK_ACCOUNT });
  }

  return {
    deliveryFlatFeeCrc: settings.delivery.flatFeeCrc,
    sinpePhone: settings.payment.sinpePhone,
    sinpeHolder: settings.payment.sinpeHolder,
    bankAccounts,
    whatsappPhone: settings.contact.whatsappPhone,
    contactEmail: settings.contact.email,
  };
}

export async function getDeliveryFeeForOrder(_location?: {
  latitude: number;
  longitude: number;
}) {
  const settings = await getPublicAppSettings();

  if (settings.delivery.mode !== "flat") {
    throw new Error(
      "El cálculo de envío por distancia todavía no está habilitado. Cambia temporalmente la configuración a tarifa fija."
    );
  }

  if (settings.delivery.flatFeeCrc === null) {
    throw new Error(
      "La tarifa de envío todavía no está configurada. Configúrala desde Admin → Configuración antes de recibir pedidos."
    );
  }

  return Math.round(settings.delivery.flatFeeCrc);
}
