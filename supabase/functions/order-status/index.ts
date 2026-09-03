import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const allowedStatuses = new Set([
  "pending_payment",
  "preparing",
  "ready",
  "delivered",
]);

async function sendWhatsApp(
  phone: string,
  message: string
) {
  console.log("=== Enviando WhatsApp ===");
  console.log({
    phone,
    message,
  });

  // Aquí irá la llamada real a la API de WhatsApp.
  return true;
}

function buildMessage(
  customerName: string,
  status: string,
  total: number
) {
  switch (status) {
    case "pending_payment":
      return `¡Hola, ${customerName}!
Hemos recibido tu pedido en Altavera. 🌿
Total del pedido: ₡${total.toLocaleString("es-CR")}
En este momento estamos esperando la confirmación de tu pago. Una vez recibido, comenzaremos a preparar tu pedido.
¡Gracias por confiar en nosotros!`;

    case "preparing":
      return `¡Hola, ${customerName}!
Ya comenzamos a preparar tu pedido con mucho cuidado. 🥬
Estamos seleccionando productos frescos para que lleguen en las mejores condiciones.
Te avisaremos nuevamente cuando tu pedido esté listo para la entrega.`;

    case "ready":
      return `¡Hola, ${customerName}!
Tu pedido ya salió para entrega. 📦
Va en camino a la dirección que registraste.
Gracias por comprar en Altavera.`;

    case "delivered":
      return `¡Hola, ${customerName}!
Tu pedido fue entregado correctamente. ✅
Esperamos que disfrutes tus productos frescos y que hayas tenido una excelente experiencia con nosotros.
¡Gracias por elegir Altavera!`;

    default:
      return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return Response.json(
      { success: false, error: "Método no permitido" },
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  try {
    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return Response.json(
        { success: false, error: "No autenticado" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Faltan variables de entorno de Supabase"
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { success: false, error: "No autenticado" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const {
      data: isAdmin,
      error: adminError,
    } = await userClient.rpc("is_admin");

    if (adminError || isAdmin !== true) {
      return Response.json(
        { success: false, error: "No autorizado" },
        {
          status: 403,
          headers: corsHeaders,
        }
      );
    }

    const body = await req.json();
    const orderId = String(body.orderId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!orderId || !allowedStatuses.has(status)) {
      return Response.json(
        { success: false, error: "Datos inválidos" },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: order,
      error: orderError,
    } = await adminClient
      .from("orders")
      .select("id,guest_name,guest_phone,total,status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json(
        { success: false, error: "Pedido no encontrado" },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    // El cliente solo indica qué pedido cambió y a qué estado.
    // Nombre, teléfono y total siempre se leen de la base de datos.
    const customerName = String(
      order.guest_name ?? "cliente"
    );
    const phone = String(order.guest_phone ?? "");
    const total = Number(order.total ?? 0);
    const message = buildMessage(
      customerName,
      status,
      total
    );

    await sendWhatsApp(phone, message);

    return Response.json(
      {
        success: true,
        orderId,
        status,
        message,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("ERROR ORDER STATUS:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
