"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesCard() {
  const { favoriteIds, loading } = useFavorites();

  return (
    <section className="profile-card profile-favorites-card">
      <div className="profile-favorites-heading">
        <span className="profile-favorites-icon" aria-hidden="true">
          <Heart size={21} />
        </span>

        <div>
          <h2>Mis favoritos</h2>
          <p>
            {loading
              ? "Cargando tus favoritos..."
              : favoriteIds.size === 0
                ? "Guarda los productos que compras o consultas más seguido."
                : `${favoriteIds.size} ${favoriteIds.size === 1 ? "producto guardado" : "productos guardados"}.`}
          </p>
        </div>
      </div>

      <Link href="/favoritos" className="profile-btn profile-link-btn">
        Ver mis favoritos
      </Link>
    </section>
  );
}
