export interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  image: string;
  maturity_selection_enabled?: boolean;
  is_seasonal?: boolean;
}
