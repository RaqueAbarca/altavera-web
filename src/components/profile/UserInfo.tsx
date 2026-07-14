"use client";

import { useEffect, useState } from "react";
import { FaEnvelope, FaPhone, FaUser } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  name: string;
  email: string;
  phone: string;
};

export default function UserInfo() {

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);


  async function loadUser(){

    const {
      data:{
        user
      },
      error
    } = await supabase.auth.getUser();


    if(error){

      console.error(
        "ERROR OBTENIENDO USUARIO:",
        error
      );

      setLoading(false);
      return;

    }


if(user){

  console.log("USUARIO COMPLETO:", user);

  setUser({

        name:
            user.user_metadata?.full_name ||
            "Usuario",

        email:
          user.email ||
          "",

        phone:
          user.user_metadata?.phone ||
          "No registrado"

      });

    }


    setLoading(false);

  }


  useEffect(()=>{

    loadUser();

  },[]);



  if(loading){

    return (

      <section className="profile-card">

        <p>
          Cargando información...
        </p>

      </section>

    );

  }



  if(!user){

    return (

      <section className="profile-card">

        <p>
          No hay usuario conectado.
        </p>

      </section>

    );

  }



  return (

    <section className="profile-card">

      <h2>
        Información personal
      </h2>


      <div className="profile-info">


        <p>

          <FaUser />

          <span>
            Nombre
          </span>

          <strong>
            {user.name}
          </strong>

        </p>



        <p>

          <FaEnvelope />

          <span>
            Correo
          </span>

          <strong>
            {user.email}
          </strong>

        </p>



        <p>

          <FaPhone />

          <span>
            Teléfono
          </span>

          <strong>
            {user.phone}
          </strong>

        </p>


      </div>



      <button className="profile-btn">

        Editar información

      </button>


    </section>

  );

}