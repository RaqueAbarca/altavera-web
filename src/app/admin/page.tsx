"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import "./admin.css";

export default function AdminLogin(){

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

    async function handleLogin() {
        setError("");

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
            });

            if (error) {
            setError("Correo o contraseña incorrectos");
            return;
            }

            // Usar window.location.href obliga al navegador a enviar 
            // todas las cookies frescas directamente al Middleware
            window.location.href = "/admin/dashboard";

        } catch (err) {
            console.error("Error inesperado en el inicio de sesión:", err);
        }
    }


  return(
    <main className="admin-login">

      <h1>
        Altavera Admin
      </h1>


      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />


      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />


      <button onClick={handleLogin}>
        Ingresar
      </button>


      {
        error &&
        <p>
          {error}
        </p>
      }


    </main>
  );
}