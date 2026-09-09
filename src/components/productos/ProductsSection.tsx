"use client";

import "./productos.css";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";
import ProductCard from "../ui/ProductCard";
import FavoriteLoginPrompt from "../ui/FavoriteLoginPrompt";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { SEASONAL_CATEGORY } from "./productFilters";
import type { MaturityPreference } from "@/lib/maturity";

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

type Props = {
  products: Product[];
  selectedCategory: string;
  search: string;
  favoritesOnly?: boolean;
};

export default function ProductsSection({
  products,
  selectedCategory,
  search,
  favoritesOnly = false,
}: Props) {
  const pathname = usePathname();
  const [showFavoriteLoginPrompt, setShowFavoriteLoginPrompt] = useState(false);
  const {
    favoriteIds,
    isAuthenticated,
    loading: favoritesLoading,
    pendingIds,
    toggleFavorite,
  } = useFavorites();
  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "Todos" ||
      (selectedCategory === SEASONAL_CATEGORY
        ? product.is_seasonal === true
        : product.category === selectedCategory);

    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    const matchesFavorites =
      !favoritesOnly || favoriteIds.has(product.id);

    return matchesCategory && matchesSearch && matchesFavorites;
  });

  async function handleToggleFavorite(productId: number) {
    const result = await toggleFavorite(productId);

    if (result === "requires-login") {
      setShowFavoriteLoginPrompt(true);
    }
  }

  if (favoritesOnly && favoritesLoading) {
    return <div className="favorites-state-card">Cargando tus favoritos...</div>;
  }

  if (favoritesOnly && !isAuthenticated) {
    return (
      <div className="favorites-empty-state">
        <span className="favorites-empty-state__icon" aria-hidden="true">
          <Heart size={25} />
        </span>
        <h2>Inicia sesión para ver tus favoritos</h2>
        <p>
          Tus productos guardados quedan vinculados a tu cuenta para que puedas
          encontrarlos desde cualquier dispositivo.
        </p>
        <Link href="/login?redirect=/favoritos" className="favorites-primary-link">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (favoritesOnly && filteredProducts.length === 0) {
    return (
      <div className="favorites-empty-state">
        <span className="favorites-empty-state__icon" aria-hidden="true">
          <Heart size={25} />
        </span>
        <h2>Todavía no tienes favoritos</h2>
        <p>
          Toca el corazón de cualquier producto para guardarlo aquí y tenerlo
          más a mano la próxima vez.
        </p>
        <Link href="/productos" className="favorites-primary-link">
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="products-grid">
        {filteredProducts.map((product) => {
          const cartItem = cart.find(
            (item) => item.id === product.id
          );

          const quantity = cartItem?.quantity ?? 0;

          return (
            <ProductCard
              key={product.id}
              image={product.image_url}
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
              isFavorite={favoriteIds.has(product.id)}
              favoritePending={pendingIds.has(product.id)}
              onToggleFavorite={() => void handleToggleFavorite(product.id)}
              onAdd={(quantity, maturityPreference: MaturityPreference | null) =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  description: product.description,
                  category: product.category,
                  price: product.price,
                  unit: product.unit,
                  image: product.image_url,
                  quantity,
                  maturity_selection_enabled:
                    product.maturity_selection_enabled ?? false,
                  maturity_preference: maturityPreference,
                })
              }
              onIncrease={() =>
                increaseQuantity(product.id)
              }
              onDecrease={() =>
                decreaseQuantity(product.id)
              }
              onRemove={() =>
                removeFromCart(product.id)
              }
            />
          );
        })}
      </div>

      <FavoriteLoginPrompt
        open={showFavoriteLoginPrompt}
        returnTo={pathname}
        onClose={() => setShowFavoriteLoginPrompt(false)}
      />
    </>
  );
}
