"use client";

import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

export default function ProfileHeader() {

  const [name, setName] = useState("Mi perfil");


  useEffect(()=>{

    async function loadUser(){

      const {
        data:{
          user
        }
      } = await supabase.auth.getUser();


      if(user){

        setName(
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Usuario"
        );

      }

    }


    loadUser();

  },[]);



  return (

    <section className="profile-header">

      <FaUserCircle className="profile-avatar" />

      <div>

        <h1>
          {name}
        </h1>

        <p>
          Administra tu información y consulta el estado de tus pedidos.
        </p>

      </div>

    </section>

  );

}