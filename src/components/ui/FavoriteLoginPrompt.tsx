"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import "../productos/productos.css";

type FavoriteLoginPromptProps = {
  open: boolean;
  returnTo: string;
  onClose: () => void;
};

export default function FavoriteLoginPrompt({
  open,
  returnTo,
  onClose,
}: FavoriteLoginPromptProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="favorite-login-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className="favorite-login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-login-title"
        aria-describedby="favorite-login-description"
      >
        <span className="favorite-login-dialog__icon" aria-hidden="true">
          <Heart size={22} />
        </span>

        <h2 id="favorite-login-title">Guarda tus favoritos</h2>
        <p id="favorite-login-description">
          Para guardar productos en favoritos debes iniciar sesión.
        </p>

        <div className="favorite-login-dialog__actions">
          <button
            type="button"
            className="favorite-login-cancel"
            onClick={onClose}
          >
            Cancelar
          </button>

          <Link
            href={`/login?redirect=${encodeURIComponent(returnTo)}`}
            className="favorite-login-confirm"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
