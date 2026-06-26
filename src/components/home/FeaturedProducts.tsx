"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "../ui/ProductCard";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: string;
  unit: string;
  image_url: string;
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .limit (6);

      if (error) {
        console.error(error);
        return;
      }

      setProducts(data || []);
    };

    loadProducts();
  }, []);

  const featuredProducts = products.slice(0, 6);

  return (
    <section className="container section">
      <div className="section-header">
        <h2>Nuestros productos</h2>

        <Link href="/productos">
          Ver todos los productos →
        </Link>
      </div>

      <div className="featured-products">
        {featuredProducts.map((product) => (
          <ProductCard
            key={product.id}
            image={product.image_url}
            name={product.name}
            price={product.price}
            unit={product.unit}
          />
        ))}
      </div>
    </section>
  );
}