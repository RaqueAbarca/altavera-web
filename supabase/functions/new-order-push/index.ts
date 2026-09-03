import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type RequestBody = {
  orderId?: string;
  total?: number;
  deliveryDate?: string;
  test?: boolean;
};

function formatMoney(value: number) {
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}

function formatDeliveryDate(dateKey?: string) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

Deno.serve(async (request) => {
  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorization = request.headers.get("Authorization") ?? "";

    if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "";

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error("Faltan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const body = (await request.json()) as RequestBody;
    const isTest = body.test === true;
    const orderId = String(body.orderId ?? "").trim();
    const total = Number(body.total ?? 0);
    const deliveryLabel = formatDeliveryDate(body.deliveryDate);

    if (!isTest && !orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("admin_push_subscriptions")
      .select("id,endpoint,p256dh,auth");

    if (error) throw error;

    const subscriptions = (data ?? []) as PushSubscriptionRow[];
    const shortOrderId = orderId.slice(0, 8).toUpperCase();
    const details = [
      `Pedido #${shortOrderId}`,
      Number.isFinite(total) ? formatMoney(total) : null,
      deliveryLabel ? `Entrega ${deliveryLabel}` : null,
    ].filter(Boolean);

    const payload = JSON.stringify(
      isTest
        ? {
            title: "Notificación de prueba",
            body: "Las notificaciones de nuevos pedidos de Altavera funcionan correctamente.",
            tag: "altavera-push-test",
            url: "/admin/configuracion",
          }
        : {
            title: "Nuevo pedido recibido",
            body: details.join(" · "),
            tag: `altavera-order-${orderId}`,
            orderId,
            url: "/admin/pedidos",
          }
    );

    let sent = 0;
    let removed = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
            {
              TTL: 3600,
              urgency: "high",
            }
          );
          sent += 1;
        } catch (pushError) {
          const statusCode =
            typeof pushError === "object" && pushError !== null && "statusCode" in pushError
              ? Number((pushError as { statusCode?: unknown }).statusCode)
              : null;

          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("admin_push_subscriptions")
              .delete()
              .eq("id", subscription.id);
            removed += 1;
            return;
          }

          console.error("WEB PUSH ERROR:", pushError);
        }
      })
    );

    return new Response(
      JSON.stringify({ ok: true, sent, removed, subscriptions: subscriptions.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("NEW ORDER PUSH ERROR:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Push failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
