"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { use } from "react";

import "./pedido.css";

export default function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = use(params);



  const [order,setOrder] = useState<any>(null);



  useEffect(()=>{


    const loadOrder = async()=>{


      const {data,error}=

      await supabase
      .from("orders")
      .select(`
        *,
        order_item(*)
      `)
      .eq(
        "id",
        id
      )
      .single();



      if(error){

        console.error(error);
        return;

      }


      setOrder(data);


    };


    loadOrder();


  },[]);



  if(!order){

    return (
      <main className="container">
        Cargando pedido...
      </main>
    )

  }



  return (

    <main className="container pedido-page">


      <div className="success-card">


        <h1>
          ✅ Pedido recibido
        </h1>


        <p>
          Gracias por tu compra.
        </p>


        <h3>
          Pedido:
        </h3>


        <strong>
          #{order.id.slice(0,8)}
        </strong>



        <div className="pedido-items">


        {order.order_item.map(
          (item:any)=>(

          <div
          key={item.id}
          className="pedido-item"
          >


            <span>
              {item.product_name}
              {" x "}
              {item.quantity}
            </span>


            <strong>
              ₡
              {(
                item.price *
                item.quantity
              ).toLocaleString()}
            </strong>


          </div>

        ))}


        </div>



        <hr />



        <div>

          Subtotal:

          <strong>
          ₡
          {order.subtotal.toLocaleString()}
          </strong>


        </div>



        <div>

          Total:

          <strong>
          ₡
          {order.total.toLocaleString()}
          </strong>


        </div>




        <div className="payment-box">

          <h3>
            Pago por SINPE
          </h3>


          <p>
            Envía el comprobante al WhatsApp:
          </p>


          <strong>
            8652-6792
          </strong>


        </div>



        <Link
        href="/productos"
        >
          Seguir comprando
        </Link>



      </div>



    </main>

  );

}