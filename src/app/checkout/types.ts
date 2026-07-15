export type GuestLocation = {
  lat: number;
  lng: number;
};

export type OrderInput = {
  customer_id?: string | null;
  guest_name: FormDataEntryValue | null;
  guest_phone: FormDataEntryValue | null;
  guest_email: FormDataEntryValue | null;

  latitude: number;
  longitude: number;

  address_description: FormDataEntryValue | null;

  subtotal: number;
  shipping: number;
  total: number;

  payment_method: string;
  status: string;
};