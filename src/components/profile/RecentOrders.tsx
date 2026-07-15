"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};


type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
};



export default function RecentOrders() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);



  async function loadOrders() {

    const {
      data:{
        user
      }
    } = await supabase.auth.getUser();


    if(!user){

      setLoading(false);
      return;

    }



    const {
      data,
      error
    } = await supabase
      .from("orders")
      .select(
        "id,status,total,created_at"
      )
      .eq(
        "customer_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      )
      .limit(3);



    if(error){

      console.error(
        "ERROR HISTORIAL:",
        error
      );

      setLoading(false);
      return;

    }



    const ordersWithItems = await Promise.all(

      (data || []).map(async(order)=>{


        const {
          data:items,
          error:itemError
        } = await supabase
          .from("order_item")
          .select(
            "id,product_name,quantity,price"
          )
          .eq(
            "order_id",
            order.id
          );


        if(itemError){

          console.error(
            "ERROR PRODUCTOS PEDIDO:",
            itemError
          );

        }



        return {

          ...order,

          items: items || []

        };


      })

    );



    setOrders(
      ordersWithItems
    );

    setLoading(false);

  }



  useEffect(()=>{

    loadOrders();

  },[]);




  return (

    <section className="profile-card">

      <h2>
        Mis pedidos
      </h2>



      {
        loading ? (

          <p>
            Cargando pedidos...
          </p>


        ) : orders.length === 0 ? (

          <p>
            Todavía no tienes pedidos.
          </p>


        ) : (


          orders.map(order=>(

            <div
              className="profile-order"
              key={order.id}
            >


              <div className="order-info">


                <h3>
                  Pedido #{order.id.slice(0,8)}
                </h3>



                <ul className="order-products">

                  {
                    order.items.map(item=>(

                      <li key={item.id}>

                        {item.product_name}

                        {" x "}

                        {item.quantity}

                      </li>

                    ))
                  }

                </ul>



                <p>

                  Total:
                  {" "}
                  ₡{order.total.toLocaleString("es-CR")}

                </p>


              </div>




              <span
                className={`status ${order.status}`}
              >

                {order.status}

              </span>



            </div>

          ))

        )
      }



      <button className="profile-btn">

        Ver historial completo

      </button>


    </section>

  );

}