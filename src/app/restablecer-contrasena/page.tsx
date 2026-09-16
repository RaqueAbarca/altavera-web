"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "../login/login.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareRecovery() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          url.searchParams.delete("code");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) {
          throw new Error(
            "El enlace para restablecer la contraseña no es válido o ya venció. Solicita uno nuevo."
          );
        }

        if (active) setReady(true);
      } catch (recoveryError) {
        if (active) {
          setError(
            recoveryError instanceof Error
              ? recoveryError.message
              : "No se pudo validar el enlace de recuperación."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void prepareRecovery();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage("Tu contraseña fue actualizada correctamente.");
      setPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar la contraseña."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-container">
      <h1 className="login-title">Restablecer contraseña</h1>

      {loading ? (
        <p className="login-helper-text">Validando enlace...</p>
      ) : ready && !message ? (
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="form-input"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="form-input"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={saving} className="submit-button">
            {saving ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      ) : null}

      {!loading && error && !ready && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="toggle-container">
        <Link className="login-text-link" href="/login">
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
