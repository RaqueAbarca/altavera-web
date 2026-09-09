export type SavedAddress = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  address_description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};
