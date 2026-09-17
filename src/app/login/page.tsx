"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legalConsent";
import { getAuthErrorMessage } from "@/lib/authMessages";
import "./login.css";

export default function ClientLoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  const resetRegistrationFields = () => {
    setFirstName("");
    setLastName("");
    setPreferredName("");
    setPhone("");
    setLegalAccepted(false);
    setMarketingOptIn(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!legalAccepted) {
          throw new Error("Debes aceptar los Términos y Condiciones para crear tu cuenta.");
        }

        const acceptedAt = new Date().toISOString();
        const cleanFirstName = firstName.trim();
        const cleanLastName = lastName.trim();
        const cleanPreferredName = preferredName.trim() || cleanFirstName;
        const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(" ");

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: {
              first_name: cleanFirstName,
              last_name: cleanLastName,
              preferred_name: cleanPreferredName,
              full_name: fullName,
              phone: phone.trim(),
              terms_version: TERMS_VERSION,
              terms_accepted_at: acceptedAt,
              privacy_version: PRIVACY_VERSION,
              privacy_acknowledged_at: acceptedAt,
              marketing_opt_in: marketingOptIn,
              marketing_opt_in_at: marketingOptIn ? acceptedAt : null,
            },
          },
        });

        if (signupError) throw signupError;

        if (signupData.session) {
          await fetch("/api/marketing/sync-account", { method: "POST" }).catch(() => null);
          window.location.href = "/profile";
          return;
        }

        setConfirmationEmail(email.trim());
        setAwaitingConfirmation(true);
        resetRegistrationFields();
        setPassword("");
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw loginError;

      await fetch("/api/marketing/sync-account", { method: "POST" }).catch(() => null);

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safeRedirect =
        redirect === "checkout"
          ? "/checkout"
          : redirect?.startsWith("/") && !redirect.startsWith("//")
            ? redirect
            : "/profile";

      window.location.href = safeRedirect;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Debes aceptar")) {
        setError(err.message);
      } else {
        setError(
          getAuthErrorMessage(
            err as { message?: string; code?: string },
            "No pudimos completar la acción. Revisa tus datos e inténtalo nuevamente."
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });

      if (resetError) throw resetError;
      setMessage(
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
      );
    } catch (resetError: unknown) {
      setError(
        getAuthErrorMessage(
          resetError as { message?: string; code?: string },
          "No se pudo enviar el enlace de recuperación. Inténtalo nuevamente."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <main className="login-container confirmation-container">
        <div className="confirmation-icon" aria-hidden="true">
          <MailCheck size={38} />
        </div>
        <h1 className="login-title">Revisa tu correo</h1>
        <p className="confirmation-text">
          Te enviamos un enlace de confirmación a <strong>{confirmationEmail}</strong>.
        </p>
        <p className="confirmation-text">
          Abre ese correo y toca <strong>“Confirmar mi cuenta”</strong>. El enlace te llevará de
          vuelta a Altavera con tu cuenta ya confirmada.
        </p>
        <div className="confirmation-note">
          Si no lo ves en unos minutos, revisa también las carpetas de Spam, Social o Promociones.
        </div>
        <p className="confirmation-close">Puedes cerrar esta pestaña mientras confirmas tu correo.</p>
      </main>
    );
  }

  return (
    <main className="login-container">
      <h1 className="login-title">{isRegister ? "Crear una cuenta" : "Iniciar Sesión"}</h1>

      <form onSubmit={handleSubmit} className="login-form">
        {isRegister && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="first-name">Nombre</label>
                <input
                  id="first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                  placeholder="Raquel"
                  autoComplete="given-name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="last-name">Apellido</label>
                <input
                  id="last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="form-input"
                  placeholder="Abarca"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="preferred-name">
                  Nombre corto o apodo <span className="optional-label">(opcional)</span>
                </label>
                <input
                  id="preferred-name"
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="form-input"
                  placeholder="Ej. Raque"
                  autoComplete="nickname"
                />
                <span className="form-hint">Lo usaremos para saludarte. Si lo dejas vacío, usaremos tu nombre.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  placeholder="8888-8888"
                  autoComplete="tel"
                />
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="tu@correo.com"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
          />
        </div>

        {!isRegister && (
          <button
            type="button"
            className="forgot-password-button"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {isRegister && (
          <div className="consent-options">
            <label className="consent-option consent-option--required">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                required
              />
              <span>
                Acepto los{" "}
                <Link href="/terminos-y-condiciones" target="_blank">Términos y Condiciones</Link>{" "}
                y confirmo haber leído la{" "}
                <Link href="/privacidad" target="_blank">Política de Privacidad</Link>.
              </span>
            </label>

            <label className="consent-option">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
              />
              <span>
                Acepto recibir ofertas y novedades de Altavera por correo electrónico y/o WhatsApp.
              </span>
            </label>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <button
          type="submit"
          disabled={loading || (isRegister && !legalAccepted)}
          className="submit-button"
        >
          {loading ? "Cargando..." : isRegister ? "Registrarse" : "Ingresar"}
        </button>
      </form>

      <div className="toggle-container">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setMessage("");
            setLegalAccepted(false);
            setMarketingOptIn(false);
          }}
          className="toggle-button"
        >
          {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
        </button>
      </div>
    </main>
  );
}
