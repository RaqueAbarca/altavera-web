export type DeliveryFeeMode = "flat" | "distance";

export type DeliveryScheduleRule = {
  deliveryWeekday: number;
  cutoffWeekday: number;
  cutoffTime: string;
};

export const DELIVERY_WEEKDAYS = [
  { value: 1, label: "Lunes", shortLabel: "Lun" },
  { value: 2, label: "Martes", shortLabel: "Mar" },
  { value: 3, label: "Miércoles", shortLabel: "Mié" },
  { value: 4, label: "Jueves", shortLabel: "Jue" },
  { value: 5, label: "Viernes", shortLabel: "Vie" },
  { value: 6, label: "Sábado", shortLabel: "Sáb" },
  { value: 0, label: "Domingo", shortLabel: "Dom" },
] as const;

export type BankAccountSettings = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
};

export const EMPTY_BANK_ACCOUNT: BankAccountSettings = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  iban: "",
};

export type PublicAppSettings = {
  delivery: {
    mode: DeliveryFeeMode;
    flatFeeCrc: number | null;
    configured: boolean;
  };
  payment: {
    sinpePhone: string;
    sinpeHolder: string;
    bankAccounts: BankAccountSettings[];
  };
  contact: {
    whatsappPhone: string;
    email: string;
  };
};

export const EMPTY_PUBLIC_APP_SETTINGS: PublicAppSettings = {
  delivery: {
    mode: "flat",
    flatFeeCrc: null,
    configured: false,
  },
  payment: {
    sinpePhone: "",
    sinpeHolder: "",
    bankAccounts: [],
  },
  contact: {
    whatsappPhone: "",
    email: "",
  },
};

export type AdminAppSettings = {
  deliveryFlatFeeCrc: number | null;
  deliverySchedule: DeliveryScheduleRule[];
  deliveryScheduleConfigured: boolean;
  sinpePhone: string;
  sinpeHolder: string;
  bankAccounts: BankAccountSettings[];
  whatsappPhone: string;
  contactEmail: string;
};
