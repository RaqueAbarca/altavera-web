"use client";

import { useRouter } from "next/navigation";
import "../admin.css";
import "./dashboard.css"

export default function AdminDashboard(){

  const router = useRouter();

  return(

    <main className="admin-container">

      <header>
        <h1>
          Altavera Admin
        </h1>

        <p>
          Seleccione una opción para administrar la plataforma.
        </p>
      </header>


      <section className="admin-menu-grid">


        <button
          className="admin-menu-card"
          onClick={()=>
            router.push("/admin/pedidos")
          }
        >

          <h2>
            📋 Pedidos
          </h2>

          <p>
            Ver pedidos recibidos,
            estados y lista de compras.
          </p>

        </button>



        <button
          className="admin-menu-card"
          onClick={()=>
            router.push("/admin/precios")
          }
        >

          <h2>
            💰 Precios CENADA
          </h2>

          <p>
            Actualizar precios mediante
            boletines de CENADA.
          </p>

        </button>



        <button
          className="admin-menu-card"
          onClick={()=>
            router.push("/admin/productos")
          }
        >

          <h2>
            🥑 Productos
          </h2>

          <p>
            Administrar productos,
            categorías e información.
          </p>

        </button>



        <button
          className="admin-menu-card"
          onClick={()=>
            router.push("/admin/cobertura")
          }
        >

          <h2>
            🗺️ Cobertura
          </h2>

          <p>
            Dibujar zonas de entrega
            y exclusiones operativas.
          </p>

        </button>



        <button
          className="admin-menu-card"
          onClick={()=>
            router.push("/admin/configuracion")
          }
        >

          <h2>
            ⚙️ Configuración
          </h2>

          <p>
            Ajustes generales del sistema.
          </p>

        </button>


      </section>


    </main>

  );

}