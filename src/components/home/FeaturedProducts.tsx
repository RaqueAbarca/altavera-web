"use client";

import "./home.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProductCard from "../ui/ProductCard";
import FavoriteLoginPrompt from "../ui/FavoriteLoginPrompt";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Product } from "@/types/product";
import type { MaturityPreference } from "@/lib/maturity";
import {
  calculateVariantPrice,
  formatVariantDescriptor,
  getVariantQuantityUnit,
  type ProductSizeVariant,
} from "@/lib/productVariants";

type SupabaseProduct = {
  id: number;
  name: string;
  price: number;
  unit: string;
  image_url: string;
  maturity_selection_enabled?: boolean;
  average_unit_weight_g?: number | null;
  approx_units_per_kg_min?: number | null;
  approx_units_per_kg_max?: number | null;
  is_seasonal?: boolean;
  variant_selection_enabled?: boolean;
  size_variants?: ProductSizeVariant[];
};

export default function FeaturedProducts() {
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [showFavoriteLoginPrompt, setShowFavoriteLoginPrompt] = useState(false);
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites();

  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
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
          maturity_selection_enabled:
            product.maturity_selection_enabled ?? false,
          average_unit_weight_g:
            product.average_unit_weight_g ?? null,
          approx_units_per_kg_min:
            product.approx_units_per_kg_min ?? null,
          approx_units_per_kg_max:
            product.approx_units_per_kg_max ?? null,
          is_seasonal: product.is_seasonal ?? false,
          variant_selection_enabled: product.variant_selection_enabled ?? false,
          size_variants: product.size_variants ?? [],
        })
      );

      setProducts(formattedProducts);
    };

    loadProducts();
  }, []);

  async function handleToggleFavorite(productId: number) {
    const result = await toggleFavorite(productId);

    if (result === "requires-login") {
      setShowFavoriteLoginPrompt(true);
    }
  }

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
              maturitySelectionEnabled={
                product.maturity_selection_enabled ?? false
              }
              maturityPreference={cartItem?.maturity_preference ?? null}
              averageUnitWeightGrams={product.average_unit_weight_g ?? null}
              unitsPerKgMin={product.approx_units_per_kg_min ?? null}
              unitsPerKgMax={product.approx_units_per_kg_max ?? null}
              isSeasonal={product.is_seasonal ?? false}
              variantSelectionEnabled={product.variant_selection_enabled ?? false}
              sizeVariants={product.size_variants ?? []}
              selectedVariantId={cartItem?.variant_id ?? null}
              isFavorite={favoriteIds.has(product.id)}
              favoritePending={pendingIds.has(product.id)}
              onToggleFavorite={() => void handleToggleFavorite(product.id)}
              onAdd={(quantity, maturityPreference: MaturityPreference | null, variantId) => {
                const variant = (product.size_variants ?? []).find(
                  (item) => item.id === variantId && item.active !== false
                );
                addToCart({
                  ...product,
                  price: variant ? calculateVariantPrice(product.price, variant) ?? product.price : product.price,
                  unit: variant ? getVariantQuantityUnit(variant) : product.unit,
                  quantity,
                  maturity_preference: maturityPreference,
                  variant_id: variant?.id ?? null,
                  variant_label: variant?.label ?? null,
                  variant_weight_label: variant ? formatVariantDescriptor(variant) || null : null,
                });
              }}
              onIncrease={() =>
                increaseQuantity(product.id)
              }
              onDecrease={() =>
                decreaseQuantity(product.id)
              }
              onRemove={() => removeFromCart(product.id)}
            />
          );
        })}
      </div>

      <FavoriteLoginPrompt
        open={showFavoriteLoginPrompt}
        returnTo={pathname}
        onClose={() => setShowFavoriteLoginPrompt(false)}
      />
    </section>
  );
}
