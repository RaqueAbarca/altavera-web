"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductsSection from "@/components/productos/ProductsSection";
import ProductFilters from "@/components/productos/productFilters";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  image_url: string;
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
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
          <Link href="/"> Inicio </Link> {" >"} Productos</p>
      </div>

      <div className="products-layout">

        {/* FILTROS */}
        <aside className="filters">
          <ProductFilters
            products={products}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </aside>

        {/* PRODUCTOS */}
        <section className="products">
          <ProductsSection
            products={products}
            selectedCategory={selectedCategory}
          />
        </section>

      </div>

    </main>
  );
}