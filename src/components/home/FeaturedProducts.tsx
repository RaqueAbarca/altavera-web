"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "../ui/ProductCard";
import { getSupabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import { Product } from "@/types/product";

const supabase = getSupabase();

type SupabaseProduct = {
  id: number;
  name: string;
  price: number;
  unit: string;
  image_url: string;
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const { addToCart } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .limit(6);

      if (error) {
        console.error(error);
        return;
      }

      const formattedProducts: Product[] = (data || []).map(
        (product: SupabaseProduct) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          image: product.image_url,
          category: "",
        })
      );

      setProducts(formattedProducts);
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
            image={product.image}
            name={product.name}
            price={product.price}
            unit={product.unit}
            onAdd={() => addToCart(product)}
          />

        ))}

      </div>

    </section>
  );
}