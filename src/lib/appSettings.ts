export type DeliveryFeeMode = "flat" | "distance";

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
  sinpePhone: string;
  sinpeHolder: string;
  bankAccounts: BankAccountSettings[];
  whatsappPhone: string;
  contactEmail: string;
};
