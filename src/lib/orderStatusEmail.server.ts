import { formatDeliveryDate } from "@/lib/deliverySchedule";

export type OrderStatusEmailStatus =
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

type SendOrderStatusEmailInput = {
  to: string | null;
  customerName: string;
  orderId: string;
  accessToken: string;
  deliveryDate: string | null;
  status: OrderStatusEmailStatus;
  contactEmail?: string | null;
  requestOrigin: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  error?: string;
  name?: string;
};

export type OrderStatusEmailResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: string };

type StatusCopy = {
  eyebrow: string;
  title: string;
  description: string;
  subject: (shortOrderId: string) => string;
  preheader: (shortOrderId: string) => string;
};

const STATUS_COPY: Record<OrderStatusEmailStatus, StatusCopy> = {
  confirmed: {
    eyebrow: "Pago confirmado",
    title: "Tu pedido ya está confirmado",
    description:
      "Ya verificamos tu pago. Tu pedido quedó confirmado para la fecha de entrega seleccionada.",
    subject: (shortOrderId) =>
      `Pago confirmado · Pedido #${shortOrderId} | Altavera`,
    preheader: (shortOrderId) =>
      `Confirmamos el pago de tu pedido #${shortOrderId}.`,
  },
  preparing: {
    eyebrow: "Preparando",
    title: "Estamos preparando tu pedido",
    description:
      "Ya comenzamos a preparar tu pedido para que llegue fresco en la fecha de entrega seleccionada.",
    subject: (shortOrderId) =>
      `Estamos preparando tu pedido #${shortOrderId} | Altavera`,
    preheader: (shortOrderId) =>
      `Tu pedido #${shortOrderId} ya está en preparación.`,
  },
  ready: {
    eyebrow: "En camino",
    title: "Tu pedido va en camino",
    description:
      "Tu pedido ya salió para entrega. Puedes consultar su estado desde el enlace de seguimiento.",
    subject: (shortOrderId) =>
      `Tu pedido #${shortOrderId} va en camino | Altavera`,
    preheader: (shortOrderId) =>
      `Tu pedido #${shortOrderId} ya salió para entrega.`,
  },
  delivered: {
    eyebrow: "Entregado",
    title: "Tu pedido fue entregado",
    description:
      "Marcamos tu pedido como entregado. Gracias por comprar en Altavera y esperamos que disfrutes tus productos.",
    subject: (shortOrderId) =>
      `Pedido #${shortOrderId} entregado | Altavera`,
    preheader: (shortOrderId) =>
      `Tu pedido #${shortOrderId} fue marcado como entregado.`,
  },
  cancelled: {
    eyebrow: "Cancelado",
    title: "Tu pedido fue cancelado",
    description:
      "Tu pedido fue marcado como cancelado. Si tienes alguna consulta sobre el pedido o el pago, puedes contactarnos y con gusto lo revisamos.",
    subject: (shortOrderId) =>
      `Pedido #${shortOrderId} cancelado | Altavera`,
    preheader: (shortOrderId) =>
      `Tu pedido #${shortOrderId} fue marcado como cancelado.`,
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeSiteOrigin(requestOrigin: string) {
  const configured = String(
    process.env.ALTAVERA_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ""
  )
    .trim()
    .replace(/\/$/, "");

  if (configured) return configured;
  return requestOrigin.replace(/\/$/, "");
}

export function isOrderStatusEmailStatus(
  value: string
): value is OrderStatusEmailStatus {
  return value === "confirmed" ||
    value === "preparing" ||
    value === "ready" ||
    value === "delivered" ||
    value === "cancelled";
}

export async function sendOrderStatusEmail(
  input: SendOrderStatusEmailInput
): Promise<OrderStatusEmailResult> {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  const from = String(process.env.ALTAVERA_EMAIL_FROM ?? "").trim();
  const to = cleanEmail(input.to);

  if (!to) {
    return { status: "skipped", reason: "El pedido no tiene un correo válido." };
  }

  if (!apiKey || !from) {
    return {
      status: "skipped",
      reason: "Falta configurar RESEND_API_KEY o ALTAVERA_EMAIL_FROM.",
    };
  }

  const copy = STATUS_COPY[input.status];
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const siteOrigin = normalizeSiteOrigin(input.requestOrigin);
  const trackingUrl = `${siteOrigin}/seguimiento/${encodeURIComponent(input.orderId)}#token=${encodeURIComponent(input.accessToken)}`;
  const deliveryLabel = input.deliveryDate
    ? formatDeliveryDate(input.deliveryDate)
    : "Fecha por confirmar";
  const customerName = input.customerName.trim();
  const greeting = customerName ? `Hola ${customerName},` : "Hola,";
  const replyTo = cleanEmail(input.contactEmail);

  if (!input.accessToken.trim()) {
    return {
      status: "skipped",
      reason: "El pedido no tiene un enlace privado de seguimiento.",
    };
  }

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f7f2ea;font-family:Arial,Helvetica,sans-serif;color:#29332c;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader(shortOrderId))}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2ea;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e7e1d8;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#1f402a;color:#ffffff;">
                <div style="font-size:23px;font-weight:800;letter-spacing:.01em;">Altavera</div>
                <div style="margin-top:5px;font-size:12px;color:#e4eee6;">Frutas y verduras frescas a tu puerta</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 10px;text-align:center;">
                <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#edf4ee;color:#31563c;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</div>
                <h1 style="margin:16px 0 9px;font-size:27px;line-height:1.18;color:#1f402a;">${escapeHtml(copy.title)}</h1>
                <p style="max-width:470px;margin:0 auto;color:#606862;font-size:14px;line-height:1.65;">${escapeHtml(greeting)} ${escapeHtml(copy.description.charAt(0).toLowerCase() + copy.description.slice(1))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="width:50%;padding:15px 16px;background:#faf9f6;border-radius:14px 0 0 14px;vertical-align:top;">
                      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#777d78;">Pedido</div>
                      <div style="margin-top:5px;font-size:16px;font-weight:800;color:#26382c;">#${escapeHtml(shortOrderId)}</div>
                    </td>
                    <td style="width:50%;padding:15px 16px;background:#faf9f6;border-radius:0 14px 14px 0;text-align:right;vertical-align:top;">
                      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#777d78;">Entrega</div>
                      <div style="margin-top:5px;font-size:14px;font-weight:800;color:#26382c;text-transform:capitalize;">${escapeHtml(deliveryLabel)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 30px;text-align:center;">
                <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#1f402a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;">Seguir mi pedido</a>
                <p style="margin:22px 0 0;color:#777e78;font-size:11px;line-height:1.55;">Este correo corresponde a una actualización de tu pedido en Altavera.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    greeting,
    copy.description,
    "",
    `Pedido #${shortOrderId}`,
    `Entrega: ${deliveryLabel}`,
    `Estado: ${copy.eyebrow}`,
    "",
    `Seguir mi pedido: ${trackingUrl}`,
    "",
    "Este es un correo transaccional relacionado con tu pedido en Altavera.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `order-status/${input.orderId}/${input.status}`,
      "User-Agent": "Altavera/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: copy.subject(shortOrderId),
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags: [
        { name: "type", value: "order_status" },
        { name: "status", value: input.status },
        { name: "order", value: shortOrderId },
      ],
    }),
    cache: "no-store",
  });

  const raw = await response.text();
  let data: ResendResponse = {};

  if (raw) {
    try {
      data = JSON.parse(raw) as ResendResponse;
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    const detail = data.message || data.error || data.name || raw || "Error desconocido";
    throw new Error(`Resend respondió ${response.status}: ${detail}`);
  }

  return { status: "sent", id: data.id ?? null };
}
