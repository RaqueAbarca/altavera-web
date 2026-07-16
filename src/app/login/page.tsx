"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./login.css";

export default function ClientLoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Nuevos campos para el registro
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isRegister) {
        // --- REGISTRO DE NUEVO CLIENTE CON DATOS DE PERFIL ---
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            // Guardamos el nombre y el teléfono dentro de los metadatos del usuario en Supabase
            data: {
              full_name: name,
              phone: phone,
            }
          },
        });

        if (signupError) throw signupError;

        setMessage("¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales.");
        setIsRegister(false);
        // Limpiamos los campos adicionales
        setName("");
        setPhone("");
      } else {
        // --- INICIO DE SESIÓN ---
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        // Redirección nativa para garantizar que las cookies viajen de inmediato al Middleware
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");

        window.location.href =
          redirect === "checkout"
            ? "/checkout"
            : "/profile";
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <h1 className="login-title">
        {isRegister ? "Crear una cuenta" : "Iniciar Sesión"}
      </h1>

      <form onSubmit={handleSubmit} className="login-form">
        
        {/* CAMPOS DINÁMICOS: Solo se muestran si el usuario va a registrarse */}
        {isRegister && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Nombre Apellidos"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
                placeholder="8888-8888"
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Correo Electrónico</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="tu@correo.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <button
          type="submit"
          disabled={loading}
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
          }}
          className="toggle-button"
        >
          {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
        </button>
      </div>
    </main>
  );
}