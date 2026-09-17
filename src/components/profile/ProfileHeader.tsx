"use client";

import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { getPreferredUserName } from "@/lib/userName";

export default function ProfileHeader() {

  const [name, setName] = useState("");


  useEffect(()=>{

    async function loadUser(){

      const {
        data:{
          user
        }
      } = await supabase.auth.getUser();


      if(user){

        setName(getPreferredUserName(user.user_metadata, user.email));

      }

    }


    loadUser();

  },[]);



  return (

    <section className="profile-header">

      <FaUserCircle className="profile-avatar" />

      <div>

        <h1>
          {name ? `¡Hola, ${name}!` : "Mi perfil"}
        </h1>

        <p>
          Administra tu información y consulta el estado de tus pedidos.
        </p>

      </div>

    </section>

  );

}