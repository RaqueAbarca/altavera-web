"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PUBLIC_APP_SETTINGS,
  type PublicAppSettings,
} from "@/lib/appSettings";

export function usePublicAppSettings() {
  const [settings, setSettings] = useState<PublicAppSettings>(EMPTY_PUBLIC_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/app-settings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar la configuración de Altavera");
        }

        if (active) {
          setSettings(data as PublicAppSettings);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la configuración de Altavera"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading, error };
}
