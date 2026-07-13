const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


export default {
  async fetch(req: Request) {


    // Respuesta para la petición OPTIONS (CORS)
    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        }
      );
    }


    try {

      const body = await req.json();

      console.log(
        "Cambio de estado recibido:",
        body
      );


      return Response.json(
        {
          success:true,
          message:"Estado recibido correctamente",
          order:body,
        },
        {
          headers:corsHeaders,
        }
      );


    } catch(error){

      return Response.json(
        {
          success:false,
          error:
            error instanceof Error
              ? error.message
              : "Error desconocido",
        },
        {
          status:400,
          headers:corsHeaders,
        }
      );

    }

  },
};