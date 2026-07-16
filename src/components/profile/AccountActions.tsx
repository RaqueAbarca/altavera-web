"use client";

import { FaSignOutAlt } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

export default function AccountActions() {

  async function handleLogout() {

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión:", error);
      return;
    }

    window.location.replace("/");

  }

  return (

    <section className="profile-card">

      <h2>
        Cuenta
      </h2>

      <button
        className="logout-btn"
        onClick={handleLogout}
      >

        <FaSignOutAlt />

        Cerrar sesión

      </button>

    </section>

  );

}