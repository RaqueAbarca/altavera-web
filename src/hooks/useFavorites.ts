"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ToggleFavoriteResult = "updated" | "requires-login" | "error" | "busy";

export function useFavorites() {
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async (nextUserId: string) => {
    const { data, error } = await supabase
      .from("customer_favorites")
      .select("product_id")
      .eq("user_id", nextUserId);

    if (error) {
      console.error("ERROR CARGANDO FAVORITOS:", error);
      setFavoriteIds(new Set());
      return;
    }

    setFavoriteIds(
      new Set((data ?? []).map((favorite) => Number(favorite.product_id)))
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setUserId(user?.id ?? null);

      if (user) {
        await loadFavorites(user.id);
      } else {
        setFavoriteIds(new Set());
      }

      if (active) setLoading(false);
    }

    void loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);

      if (!nextUserId) {
        setFavoriteIds(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);
      void loadFavorites(nextUserId).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadFavorites]);

  async function toggleFavorite(productId: number): Promise<ToggleFavoriteResult> {
    if (pendingIds.has(productId)) return "busy";

    let currentUserId = userId;

    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return "requires-login";

      currentUserId = user.id;
      setUserId(user.id);
    }

    const wasFavorite = favoriteIds.has(productId);

    setPendingIds((current) => {
      const next = new Set(current);
      next.add(productId);
      return next;
    });

    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(productId);
      else next.add(productId);
      return next;
    });

    const { error } = wasFavorite
      ? await supabase
          .from("customer_favorites")
          .delete()
          .eq("user_id", currentUserId)
          .eq("product_id", productId)
      : await supabase.from("customer_favorites").insert({
          user_id: currentUserId,
          product_id: productId,
        });

    if (error) {
      console.error("ERROR ACTUALIZANDO FAVORITO:", error);
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });
    }

    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(productId);
      return next;
    });

    return error ? "error" : "updated";
  }

  return {
    favoriteIds,
    isAuthenticated: Boolean(userId),
    loading,
    pendingIds,
    toggleFavorite,
  };
}
