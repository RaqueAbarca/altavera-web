const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(phone:string,message:string){
  console.log("=== Enviando WhatsApp ===");
  console.log({
    phone,
    message,
  });

  // Aquí irá la llamada a la API de WhatsApp.
  // Ejemplo:
  // await fetch("https://...",{
  //   method:"POST",
  //   headers:{...},
  //   body:JSON.stringify({...})
  // });

  return true;
}

export default{
  async fetch(req:Request){

    if(req.method==="OPTIONS"){
      return new Response("ok",{headers:corsHeaders});
    }

    try{

      const{
        customerName,
        status,
        orderId,
        phone,
        total,
      }=await req.json();

      let message="";

    switch (status) {

      case "pending_payment":

        message =
    `¡Hola, ${customerName}!
    Hemos recibido tu pedido en Altavera. 🌿
    Total del pedido: ₡${total.toLocaleString("es-CR")}
    En este momento estamos esperando la confirmación de tu pago. Una vez recibido, comenzaremos a preparar tu pedido.
    ¡Gracias por confiar en nosotros!`;
        break;

      case "preparing":
        message =
    `¡Hola, ${customerName}!
    Ya comenzamos a preparar tu pedido con mucho cuidado. 🥬
    Estamos seleccionando productos frescos para que lleguen en las mejores condiciones.
    Te avisaremos nuevamente cuando tu pedido esté listo para la entrega.`;
        break;

      case "ready":
        message =
    `¡Hola, ${customerName}!
    ¡Tu pedido ya está listo! 📦
    Nuestro equipo lo entregará muy pronto en la dirección que registraste.
    Gracias por comprar en Altavera.`;
        break;

      case "delivered":
        message =
    `¡Hola, ${customerName}!
    Tu pedido fue entregado correctamente. ✅
    Esperamos que disfrutes tus productos frescos y que hayas tenido una excelente experiencia con nosotros.
    ¡Gracias por elegir Altavera!`;
        break;

      default:
        message =
    `¡Hola, ${customerName}!
    El estado de tu pedido cambió a: ${status}.
    Si tienes alguna consulta, con gusto estaremos para ayudarte.`;

    }

      await sendWhatsApp(phone,message);

      return Response.json({
        success:true,
        orderId,
        phone,
        total,
        message,
      },{
        headers:corsHeaders,
      });

    }catch(error){

      return Response.json({
        success:false,
        error:error instanceof Error
          ? error.message
          : "Error desconocido",
      },{
        status:400,
        headers:corsHeaders,
      });

    }

  },
};