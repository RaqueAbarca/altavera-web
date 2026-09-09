import { formatCRC } from "@/lib/deliveryFee";
import { formatDeliveryDate } from "@/lib/deliverySchedule";
import { getMaturityLabel } from "@/lib/maturity";
import { getPaymentMethodLabel } from "@/lib/paymentMethods";
import type { PublicAppSettings } from "@/lib/appSettings";
import { buildPaymentProofMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type OrderEmailItem = {
  productName: string;
  quantity: number;
  unit: string | null;
  maturityPreference: string | null;
  price: number;
};

type SendOrderConfirmationEmailInput = {
  to: string;
  customerName: string;
  orderId: string;
  accessToken: string;
  deliveryDate: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  items: OrderEmailItem[];
  settings: PublicAppSettings;
  requestOrigin: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  error?: string;
  name?: string;
};

export type OrderEmailResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: string };

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

function formatQuantity(quantity: number, unit: string | null) {
  const amount = quantity.toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  });
  return unit?.trim() ? `${amount} ${unit.trim()}` : amount;
}

function buildPaymentHtml(
  paymentMethod: string,
  settings: PublicAppSettings
) {
  if (paymentMethod === "SINPE") {
    if (!settings.payment.sinpePhone) return "";

    const holder = settings.payment.sinpeHolder
      ? `<div style="margin-top:4px;color:#626a64;font-size:13px;">A nombre de ${escapeHtml(settings.payment.sinpeHolder)}</div>`
      : "";

    return `
      <div style="margin-top:18px;padding:16px 18px;border:1px solid #eadfce;border-radius:14px;background:#fffaf3;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9a5b29;">Pago por SINPE Móvil</div>
        <div style="margin-top:8px;font-size:20px;font-weight:800;color:#1f402a;">${escapeHtml(settings.payment.sinpePhone)}</div>
        ${holder}
      </div>
    `;
  }

  if (paymentMethod === "BANK_TRANSFER") {
    const accounts = settings.payment.bankAccounts.filter(
      (account) => account.accountNumber || account.iban
    );

    if (accounts.length === 0) return "";

    return accounts
      .map((account, index) => {
        const rows = [
          account.bankName
            ? `<div><strong>Banco:</strong> ${escapeHtml(account.bankName)}</div>`
            : "",
          account.accountHolder
            ? `<div><strong>Titular:</strong> ${escapeHtml(account.accountHolder)}</div>`
            : "",
          account.accountNumber
            ? `<div><strong>Cuenta:</strong> ${escapeHtml(account.accountNumber)}</div>`
            : "",
          account.iban
            ? `<div><strong>IBAN:</strong> ${escapeHtml(account.iban)}</div>`
            : "",
        ]
          .filter(Boolean)
          .join("");

        return `
          <div style="margin-top:${index === 0 ? "18" : "10"}px;padding:16px 18px;border:1px solid #e2e5e1;border-radius:14px;background:#ffffff;color:#333b35;font-size:13px;line-height:1.7;">
            ${rows}
          </div>
        `;
      })
      .join("");
  }

  return "";
}

function buildPaymentText(
  paymentMethod: string,
  settings: PublicAppSettings
) {
  if (paymentMethod === "SINPE" && settings.payment.sinpePhone) {
    return [
      `SINPE Móvil: ${settings.payment.sinpePhone}`,
      settings.payment.sinpeHolder
        ? `A nombre de: ${settings.payment.sinpeHolder}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (paymentMethod === "BANK_TRANSFER") {
    const accounts = settings.payment.bankAccounts.filter(
      (account) => account.accountNumber || account.iban
    );

    return accounts
      .map((account, index) =>
        [
          accounts.length > 1 ? `Cuenta ${index + 1}` : "Transferencia bancaria",
          account.bankName ? `Banco: ${account.bankName}` : "",
          account.accountHolder ? `Titular: ${account.accountHolder}` : "",
          account.accountNumber ? `Cuenta: ${account.accountNumber}` : "",
          account.iban ? `IBAN: ${account.iban}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      )
      .join("\n\n");
  }

  return "";
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationEmailInput
): Promise<OrderEmailResult> {
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

  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const siteOrigin = normalizeSiteOrigin(input.requestOrigin);
  const orderUrl = `${siteOrigin}/pedido/${encodeURIComponent(input.orderId)}#token=${encodeURIComponent(input.accessToken)}`;
  const paymentMethodLabel = getPaymentMethodLabel(input.paymentMethod);
  const proofUrl = buildWhatsAppUrl({
    phone: input.settings.contact.whatsappPhone,
    message: buildPaymentProofMessage({
      orderId: input.orderId,
      total: formatCRC(input.total),
      paymentMethod: paymentMethodLabel,
    }),
  });
  const replyTo = cleanEmail(input.settings.contact.email);
  const deliveryLabel = formatDeliveryDate(input.deliveryDate);

  const itemRows = input.items
    .map((item) => {
      const maturity = item.maturityPreference
        ? getMaturityLabel(item.maturityPreference)
        : null;
      const details = [
        formatQuantity(item.quantity, item.unit),
        maturity ? `Maduración: ${maturity}` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eceeea;vertical-align:top;">
            <div style="font-size:14px;font-weight:750;color:#25352a;">${escapeHtml(item.productName)}</div>
            <div style="margin-top:3px;font-size:12px;color:#6a716b;">${escapeHtml(details)}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eceeea;text-align:right;vertical-align:top;font-size:13px;font-weight:700;color:#39433c;white-space:nowrap;">${escapeHtml(formatCRC(item.price * item.quantity))}</td>
        </tr>
      `;
    })
    .join("");

  const paymentHtml = buildPaymentHtml(input.paymentMethod, input.settings);
  const proofButton = proofUrl
    ? `<a href="${escapeHtml(proofUrl)}" style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:999px;background:#c97833;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;">Enviar comprobante por WhatsApp</a>`
    : "";

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f7f2ea;font-family:Arial,Helvetica,sans-serif;color:#29332c;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Recibimos tu pedido #${escapeHtml(shortOrderId)} en Altavera.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2ea;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e1d8;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#1f402a;color:#ffffff;">
                <div style="font-size:23px;font-weight:800;letter-spacing:.01em;">Altavera</div>
                <div style="margin-top:5px;font-size:12px;color:#e4eee6;">Frutas y verduras frescas a tu puerta</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 10px;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c97833;">Pedido recibido</div>
                <h1 style="margin:8px 0 8px;font-size:27px;line-height:1.15;color:#1f402a;">Hola ${escapeHtml(input.customerName)}, recibimos tu pedido.</h1>
                <p style="margin:0;color:#606862;font-size:14px;line-height:1.6;">Tu pedido quedó registrado con estado <strong>Pago por confirmar</strong>. Cuando completes el pago, envíanos el comprobante para verificarlo.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:14px 16px;background:#faf9f6;border-radius:14px 0 0 14px;">
                      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#777d78;">Pedido</div>
                      <div style="margin-top:4px;font-size:16px;font-weight:800;color:#26382c;">#${escapeHtml(shortOrderId)}</div>
                    </td>
                    <td style="padding:14px 16px;background:#faf9f6;border-radius:0 14px 14px 0;text-align:right;">
                      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#777d78;">Entrega</div>
                      <div style="margin-top:4px;font-size:14px;font-weight:800;color:#26382c;text-transform:capitalize;">${escapeHtml(deliveryLabel)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 28px 10px;">
                <h2 style="margin:0 0 6px;font-size:17px;color:#1f402a;">Tu compra</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${itemRows}</table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;font-size:13px;color:#5f675f;">
                  <tr><td style="padding:4px 0;">Subtotal</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#303a33;">${escapeHtml(formatCRC(input.subtotal))}</td></tr>
                  <tr><td style="padding:4px 0;">Envío</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#303a33;">${escapeHtml(formatCRC(input.shipping))}</td></tr>
                  <tr><td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#1f402a;">Total</td><td style="padding:10px 0 0;text-align:right;font-size:18px;font-weight:850;color:#1f402a;">${escapeHtml(formatCRC(input.total))}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 26px;">
                <div style="padding:18px;border-radius:16px;background:#f7f2ea;">
                  <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8f572b;">Qué sigue</div>
                  <div style="margin-top:8px;font-size:14px;font-weight:800;color:#26382c;">Realiza el pago por ${escapeHtml(paymentMethodLabel)}</div>
                  ${paymentHtml}
                  ${proofButton}
                </div>
                <div style="text-align:center;margin-top:22px;">
                  <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#1f402a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;">Ver mi pedido</a>
                </div>
                <p style="margin:22px 0 0;color:#777e78;font-size:11px;line-height:1.55;text-align:center;">Este correo corresponde a tu pedido en Altavera y no depende de que hayas aceptado recibir promociones.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const paymentText = buildPaymentText(input.paymentMethod, input.settings);
  const textItems = input.items
    .map((item) => {
      const maturity = item.maturityPreference
        ? getMaturityLabel(item.maturityPreference)
        : null;
      return `- ${item.productName}: ${formatQuantity(item.quantity, item.unit)}${maturity ? ` · Maduración: ${maturity}` : ""} · ${formatCRC(item.price * item.quantity)}`;
    })
    .join("\n");

  const text = [
    `Hola ${input.customerName}, recibimos tu pedido en Altavera.`,
    `Pedido #${shortOrderId}`,
    `Entrega: ${deliveryLabel}`,
    `Estado: Pago por confirmar`,
    "",
    "Tu compra:",
    textItems,
    "",
    `Subtotal: ${formatCRC(input.subtotal)}`,
    `Envío: ${formatCRC(input.shipping)}`,
    `Total: ${formatCRC(input.total)}`,
    "",
    `Método de pago: ${paymentMethodLabel}`,
    paymentText,
    proofUrl ? `Enviar comprobante: ${proofUrl}` : "",
    "",
    `Ver pedido: ${orderUrl}`,
    "",
    "Este es un correo transaccional relacionado con tu pedido en Altavera.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `order-created/${input.orderId}`,
      "User-Agent": "Altavera/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Pedido #${shortOrderId} recibido | Altavera`,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags: [
        { name: "type", value: "order_confirmation" },
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
