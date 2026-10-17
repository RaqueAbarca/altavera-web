export type DeliveryFeeMode = "flat" | "distance";
export type FuelType = "super" | "regular" | "diesel";

export type DeliveryScheduleRule = {
  deliveryWeekday: number;
  cutoffWeekday: number;
  cutoffTime: string;
  windowStartTime: string;
  windowEndTime: string;
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

export type FuelPriceSettings = Record<FuelType, number | null>;

export type DeliveryVehicleSettings = {
  id: string;
  name: string;
  fuelType: FuelType;
  consumptionLPer100Km: number | null;
  maintenanceCrcPerKm: number | null;
  active: boolean;
};

export type DeliveryDistanceSettings = {
  originLatitude: number | null;
  originLongitude: number | null;
  cenadaLatitude: number | null;
  cenadaLongitude: number | null;
  cenadaInternalKm: number;
  fuelPricesCrcPerLiter: FuelPriceSettings;
  laborRateCrcPerHour: number | null;
  stopMinutes: number | null;
  marginPercent: number;
  roundingCrc: number;
  minimumShippingCrc: number;
  vehicles: DeliveryVehicleSettings[];
};

export const EMPTY_DELIVERY_DISTANCE_SETTINGS: DeliveryDistanceSettings = {
  originLatitude: null,
  originLongitude: null,
  cenadaLatitude: 9.98031,
  cenadaLongitude: -84.15128,
  cenadaInternalKm: 2.8,
  fuelPricesCrcPerLiter: {
    super: 764,
    regular: null,
    diesel: null,
  },
  laborRateCrcPerHour: 1400,
  stopMinutes: null,
  marginPercent: 0,
  roundingCrc: 100,
  minimumShippingCrc: 1500,
  vehicles: [
    {
      id: "jeep",
      name: "Jeep",
      fuelType: "super",
      consumptionLPer100Km: 13.4,
      maintenanceCrcPerKm: null,
      active: true,
    },
  ],
};

export type DeliveryQuote = {
  mode: DeliveryFeeMode;
  shippingCrc: number;
  estimatedCostCrc: number | null;
  oneWayDistanceKm: number | null;
  roundTripDistanceKm: number | null;
  estimatedMinutes: number | null;
  calculationMethod: "flat" | "openrouteservice";
  snapshot: Record<string, unknown>;
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
  deliveryMode: DeliveryFeeMode;
  deliveryFlatFeeCrc: number | null;
  deliveryDistance: DeliveryDistanceSettings;
  deliverySchedule: DeliveryScheduleRule[];
  deliveryScheduleConfigured: boolean;
  sinpePhone: string;
  sinpeHolder: string;
  bankAccounts: BankAccountSettings[];
  whatsappPhone: string;
  contactEmail: string;
};
