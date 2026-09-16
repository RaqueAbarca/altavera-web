"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

async function syncAccount(userId: string) {
  const storageKey = `altavera-consent-sync:${userId}`;

  try {
    if (sessionStorage.getItem(storageKey) === "1") return;
  } catch {
    // sessionStorage puede no estar disponible en algunos navegadores/modos.
  }

  try {
    const response = await fetch("/api/marketing/sync-account", {
      method: "POST",
      cache: "no-store",
    });

    if (!response.ok) return;

    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // La sincronización ya ocurrió aunque no podamos guardar la marca local.
    }
  } catch {
    // Esta sincronización nunca debe bloquear la navegación del cliente.
  }
}

export default function AccountConsentSync() {
  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        void syncAccount(data.user.id);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          void syncAccount(session.user.id);
        }
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
