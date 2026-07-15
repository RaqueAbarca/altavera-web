"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "../ui/ProductCard";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import { Product } from "@/types/product";

type SupabaseProduct = {
  id: number;
  name: string;
  price: number;
  unit: string;
  image_url: string;
};

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
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

  return (
    <section className="container section">

      <div className="section-header">
        <h2>Nuestros productos</h2>

        <Link href="/productos">
          Ver todos →
        </Link>
      </div>

      <div className="featured-products">

      {products.map((product) => {

        const cartItem = cart.find(
          (item) => item.id === product.id
        );

        const quantity = cartItem?.quantity ?? 0;

        return (

          <ProductCard
            key={product.id}
            image={product.image}
            name={product.name}
            price={product.price}
            unit={product.unit}
            quantity={quantity}
            onAdd={() => addToCart(product)}
            onIncrease={() =>
              increaseQuantity(product.id)
            }
            onDecrease={() =>
              decreaseQuantity(product.id)
            }
          />

        );

      })}

      </div>

    </section>
  );
}