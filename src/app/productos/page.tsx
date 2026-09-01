"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductsSection from "@/components/productos/ProductsSection";
import ProductFilters from "@/components/productos/productFilters";
import { supabase } from "@/lib/supabase";
import SearchBar from "@/components/productos/SearchBar";

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  image_url: string;
  maturity_selection_enabled?: boolean;
  is_seasonal?: boolean;
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error(error);
        return;
      }

      setProducts(data || []);
    };

    loadProducts();
  }, []);

  return (
    <main className="container">
      <div className="header-productos">
        <h1>Nuestros productos</h1>
        <p>
          <Link href="/">Inicio</Link> {" >"} Productos
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
      />

      <div className="products-layout">
        <aside className="filters">
          <ProductFilters
            products={products}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </aside>

        <section className="products">
          <ProductsSection
            products={products}
            selectedCategory={selectedCategory}
            search={search}
          />
        </section>
      </div>
    </main>
  );
}
