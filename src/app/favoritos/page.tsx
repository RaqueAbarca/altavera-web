"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductsSection from "@/components/productos/ProductsSection";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  image_url: string;
  maturity_selection_enabled?: boolean;
  average_unit_weight_g?: number | null;
  approx_units_per_kg_min?: number | null;
  approx_units_per_kg_max?: number | null;
  is_seasonal?: boolean;
};

export default function FavoritosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (productsError) {
        console.error("ERROR CARGANDO PRODUCTOS FAVORITOS:", productsError);
        setError("No pudimos cargar los productos en este momento.");
        setLoading(false);
        return;
      }

      setProducts(data ?? []);
      setLoading(false);
    }

    void loadProducts();
  }, []);

  return (
    <main className="container favorites-page">
      <div className="header-productos favorites-page-header">
        <div>
          <h1>Mis favoritos</h1>
          <p>Ten a mano los productos que más te interesan.</p>
        </div>

        <Link href="/productos" className="favorites-back-link">
          Ver todos los productos →
        </Link>
      </div>

      {loading ? (
        <div className="favorites-state-card">Cargando tus favoritos...</div>
      ) : error ? (
        <div className="favorites-state-card favorites-state-card--error">
          {error}
        </div>
      ) : (
        <ProductsSection
          products={products}
          selectedCategory="Todos"
          search=""
          favoritesOnly
        />
      )}
    </main>
  );
}
