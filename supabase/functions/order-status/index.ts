import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const allowedStatuses = new Set([
  "pending_payment",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
]);

type WhatsAppSendResult = {
  sent: boolean;
  messageId?: string;
  skipped?: boolean;
  reason?: string;
};

function normalizeWhatsAppPhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Los teléfonos locales guardados por Altavera normalmente tienen 8 dígitos.
  // Para WhatsApp Cloud API se usa el formato internacional sin el signo +.
  if (digits.length === 8) {
    digits = `506${digits}`;
  }

  return digits;
}

async function sendWhatsAppEnCamino(params: {
  phone: string;
  customerName: string;
  orderId: string;
}): Promise<WhatsAppSendResult> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName =
    Deno.env.get("WHATSAPP_TEMPLATE_NAME") ??
    "altavera_pedido_en_camino";
  const templateLanguage =
    Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") ?? "es";
  const graphVersion =
    Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v26.0";

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "WhatsApp no está configurado. Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID."
    );
  }

  const to = normalizeWhatsAppPhone(params.phone);

  if (!to) {
    throw new Error("El pedido no tiene un número de WhatsApp válido.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateLanguage,
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: params.customerName,
                },
                {
                  type: "text",
                  text: params.orderId.slice(0, 8).toUpperCase(),
                },
              ],
            },
          ],
        },
      }),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const metaMessage =
      payload?.error?.message ??
      `WhatsApp respondió con HTTP ${response.status}`;

    console.error("ERROR WHATSAPP CLOUD API:", payload);
    throw new Error(metaMessage);
  }

  const messageId = payload?.messages?.[0]?.id;

  console.log("WHATSAPP EN CAMINO ENVIADO:", {
    orderId: params.orderId,
    to,
    messageId,
  });

  return {
    sent: true,
    messageId,
  };
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
    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return Response.json(
        { success: false, error: "No autenticado" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Faltan variables de entorno de Supabase");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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

    const { data: isAdmin, error: adminError } =
      await userClient.rpc("is_admin");

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

    // Por ahora Altavera solo envía WhatsApp automáticamente cuando el pedido
    // cambia a "ready", que en la interfaz se muestra como "En camino".
    if (status !== "ready") {
      return Response.json(
        {
          success: true,
          orderId,
          status,
          notification: {
            sent: false,
            skipped: true,
            reason: "Este estado no requiere WhatsApp automático.",
          },
        },
        { headers: corsHeaders }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id,guest_name,guest_phone,status")
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

    // Evita enviar una notificación que no corresponda al estado que quedó
    // realmente guardado en la base de datos.
    if (order.status !== "ready") {
      return Response.json(
        {
          success: false,
          error: "El pedido no está marcado como En camino.",
        },
        {
          status: 409,
          headers: corsHeaders,
        }
      );
    }

    const customerName = String(order.guest_name ?? "cliente").trim();
    const phone = String(order.guest_phone ?? "").trim();

    const notification = await sendWhatsAppEnCamino({
      phone,
      customerName: customerName || "cliente",
      orderId,
    });

    return Response.json(
      {
        success: true,
        orderId,
        status,
        notification,
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
