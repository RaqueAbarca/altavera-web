import type { PaymentMethod } from "@/lib/paymentMethods";

export type GuestLocation = {
  lat: number;
  lng: number;
};

export type OrderInput = {
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  latitude: number;
  longitude: number;
  address_description: string | null;
  customer_notes: string | null;
  delivery_cycle_id: string;
  payment_method: PaymentMethod;
  legal_accepted: boolean;
  marketing_opt_in: boolean;
};

export type CreatedOrder = {
  id: string;
  accessToken: string;
  subtotal: number;
  shipping: number;
  total: number;
};
