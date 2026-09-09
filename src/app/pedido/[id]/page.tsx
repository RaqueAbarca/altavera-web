"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import { getMaturityLabel } from "@/lib/maturity";
import { formatDeliveryDate } from "@/lib/deliverySchedule";
import { formatCRC } from "@/lib/deliveryFee";
import { getPaymentMethodLabel } from "@/lib/paymentMethods";
import { buildPaymentProofMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { usePublicAppSettings } from "@/hooks/usePublicAppSettings";
import "./pedido.css";

type OrderItem = {
  id: string;
  product_name: string;
  price: number | string;
  quantity: number | string;
  unit: string | null;
  maturity_preference: string | null;
};

type Order = {
  id: string;
  customer_notes: string | null;
  has_email: boolean;
  address_description: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  delivery_cycle: { delivery_date: string } | null;
  order_item: OrderItem[];
};

type OrderStatusTone = "pending" | "progress" | "success" | "cancelled";

type OrderStatusMeta = {
  label: string;
  description: string;
  tone: OrderStatusTone;
};

const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  pending: {
    label: "Pago por confirmar",
    description: "Completa el pago y envíanos el comprobante para poder verificarlo.",
    tone: "pending",
  },
  pending_payment: {
    label: "Pago por confirmar",
    description: "Completa el pago y envíanos el comprobante para poder verificarlo.",
    tone: "pending",
  },
  confirmed: {
    label: "Pago confirmado",
    description: "El pago ya fue verificado y tu pedido quedó confirmado.",
    tone: "success",
  },
  preparing: {
    label: "Preparando",
    description: "Estamos preparando tu pedido para la fecha de entrega seleccionada.",
    tone: "progress",
  },
  ready: {
    label: "En camino",
    description: "Tu pedido ya salió para entrega.",
    tone: "progress",
  },
  delivered: {
    label: "Entregado",
    description: "Tu pedido ya fue marcado como entregado.",
    tone: "success",
  },
  cancelled: {
    label: "Cancelado",
    description: "Este pedido fue cancelado.",
    tone: "cancelled",
  },
};

function getOrderStatusMeta(status: string): OrderStatusMeta {
  return (
    ORDER_STATUS_META[status] ?? {
      label: status,
      description: "Consulta el estado actual de tu pedido.",
      tone: "progress",
    }
  );
}

function formatQuantity(quantity: number, unit: string | null) {
  const amount = quantity.toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  });

  return unit ? `${amount} ${unit}` : amount;
}

type CopyableValueProps = {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (copyKey: string, value: string) => void;
};

function CopyableValue({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
}: CopyableValueProps) {
  const copied = copiedKey === copyKey;

  return (
    <p className="pedido-payment-row">
      <span>{label}</span>
      <span className="pedido-copy-value">
        <strong>{value}</strong>
        <button
          type="button"
          onClick={() => onCopy(copyKey, value)}
          aria-label={`Copiar ${label.toLowerCase()}`}
          title={`Copiar ${label.toLowerCase()}`}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </span>
    </p>
  );
}

export default function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings, loading: settingsLoading } = usePublicAppSettings();
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const hash = window.location.hash.replace(/^#token=/, "");
        const accessToken = hash ? decodeURIComponent(hash) : "";

        const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
          headers: accessToken
            ? { "x-order-access-token": accessToken }
            : undefined,
          cache: "no-store",
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el pedido");
        }

        setOrder(data as Order);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el pedido"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [id]);

  function copyValue(copyKey: string, value: string) {
    if (!navigator.clipboard) return;

    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(copyKey);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === copyKey ? null : current));
      }, 1600);
    });
  }

  if (loading) {
    return (
      <main className="container pedido-page pedido-state">
        Preparando la confirmación de tu pedido...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container pedido-page pedido-state">
        <div className="pedido-error-card">
          <h1>Pedido no disponible</h1>
          <p>{error ?? "No se pudo encontrar este pedido."}</p>
          <Link href="/productos" className="pedido-primary-action">
            Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  const shortOrderId = order.id.slice(0, 8).toUpperCase();
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentPending = order.status === "pending" || order.status === "pending_payment";
  const sinpePhone = settings.payment.sinpePhone;
  const bankAccounts = settings.payment.bankAccounts.filter(
    (account) => account.accountNumber || account.iban
  );
  const isBankTransfer = order.payment_method === "BANK_TRANSFER";
  const paymentMethodLabel = getPaymentMethodLabel(order.payment_method);
  const receiptWhatsAppPhone = settings.contact.whatsappPhone;
  const paymentProofUrl = paymentPending
    ? buildWhatsAppUrl({
        phone: receiptWhatsAppPhone,
        message: buildPaymentProofMessage({
          orderId: order.id,
          total: formatCRC(order.total),
          paymentMethod: paymentMethodLabel,
        }),
      })
    : null;

  return (
    <main className="container pedido-page">
      <CheckoutStepper currentStep={3} />

      <section className="pedido-confirmation-hero">
        <div className="pedido-confirmation-icon" aria-hidden="true">
          <CheckCircle2 size={32} />
        </div>
        <h1>¡Pedido recibido!</h1>
        <p>
          {paymentPending
            ? "Tu pedido quedó registrado correctamente."
            : statusMeta.description}
        </p>

        <div className="pedido-hero-order">
          <span>Número de pedido</span>
          <div className="pedido-number__value">
            <strong>#{shortOrderId}</strong>
            <button
              type="button"
              className="pedido-copy-order"
              onClick={() => copyValue("order", `#${shortOrderId}`)}
              aria-label="Copiar número de pedido"
            >
              {copiedKey === "order" ? <Check size={15} /> : <Copy size={15} />}
              {copiedKey === "order" ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {order.has_email && (
          <div className="pedido-email-notice">
            <Mail size={18} aria-hidden="true" />
            <span>Te enviamos un correo de confirmación con el resumen de tu pedido.</span>
          </div>
        )}

        <div className="pedido-hero-facts">
          {order.delivery_cycle?.delivery_date && (
            <div>
              <CalendarDays size={18} aria-hidden="true" />
              <span>Entrega</span>
              <strong>{formatDeliveryDate(order.delivery_cycle.delivery_date)}</strong>
            </div>
          )}
          <div>
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Total</span>
            <strong>{formatCRC(order.total)}</strong>
          </div>
        </div>
      </section>

      <div className="pedido-layout">
        <section className="pedido-card pedido-card--main">
          {paymentPending ? (
            <div className="pedido-payment-box pedido-payment-box--primary">
              <div className="pedido-payment-box__heading pedido-payment-box__heading--split">
                <div className="pedido-payment-title">
                  <WalletCards size={20} />
                  <div>
                    <span>Completa el pago</span>
                    <h2>{paymentMethodLabel}</h2>
                  </div>
                </div>
                <span className="pedido-status-badge pedido-status-badge--pending">
                  Pago por confirmar
                </span>
              </div>

              {settingsLoading ? (
                <p>Cargando los datos para completar el pago...</p>
              ) : isBankTransfer ? (
                bankAccounts.length > 0 ? (
                  <div className="pedido-bank-accounts">
                    <p className="pedido-bank-accounts__intro">
                      Puedes transferir a cualquiera de estas cuentas:
                    </p>
                    {bankAccounts.map((account, index) => (
                      <div className="pedido-bank-account" key={`${account.bankName}-${index}`}>
                        <strong className="pedido-bank-account__title">
                          {account.bankName || `Cuenta bancaria ${index + 1}`}
                        </strong>
                        <div className="pedido-payment-details">
                          {account.accountHolder && (
                            <p className="pedido-payment-row">
                              <span>Titular</span>
                              <strong>{account.accountHolder}</strong>
                            </p>
                          )}
                          {account.accountNumber && (
                            <CopyableValue
                              label="Número de cuenta"
                              value={account.accountNumber}
                              copyKey={`account-${index}`}
                              copiedKey={copiedKey}
                              onCopy={copyValue}
                            />
                          )}
                          {account.iban && (
                            <CopyableValue
                              label="IBAN"
                              value={account.iban}
                              copyKey={`iban-${index}`}
                              copiedKey={copiedKey}
                              onCopy={copyValue}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="pedido-payment-details pedido-payment-details--total">
                      <p className="pedido-payment-row">
                        <span>Monto</span>
                        <strong>{formatCRC(order.total)}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p>
                    Los datos de la transferencia todavía están pendientes de configurar. Tu pedido seguirá como pago pendiente hasta que Altavera lo verifique.
                  </p>
                )
              ) : sinpePhone ? (
                <div className="pedido-payment-details">
                  <CopyableValue
                    label="SINPE Móvil"
                    value={sinpePhone}
                    copyKey="sinpe"
                    copiedKey={copiedKey}
                    onCopy={copyValue}
                  />
                  <p className="pedido-payment-row">
                    <span>Monto</span>
                    <strong>{formatCRC(order.total)}</strong>
                  </p>
                </div>
              ) : (
                <p>
                  Los datos del SINPE Móvil todavía están pendientes de configurar. Tu pedido seguirá como pago pendiente hasta que Altavera lo verifique.
                </p>
              )}

              <div className="pedido-proof-reminder">
                <MessageCircle size={22} />
                <div>
                  <span>Después de pagar</span>
                  <h3>Envíanos el comprobante</h3>
                  {paymentProofUrl ? (
                    <>
                      <p>
                        Adjunta la captura en WhatsApp. El mensaje ya incluye tu número de pedido, monto y método de pago.
                      </p>
                      <a
                        href={paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pedido-whatsapp-action"
                      >
                        <MessageCircle size={18} />
                        Abrir WhatsApp y enviar comprobante
                      </a>
                      <small>
                        Cuando verifiquemos el comprobante, tu pedido pasará a confirmado.
                      </small>
                    </>
                  ) : (
                    <p>
                      El WhatsApp oficial de Altavera todavía no está configurado. Tu pedido seguirá como pago pendiente hasta que podamos habilitar el canal de comprobantes.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={`pedido-current-status pedido-current-status--${statusMeta.tone}`}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <span>Estado actual</span>
                <h2>{statusMeta.label}</h2>
                <p>{statusMeta.description}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="pedido-card pedido-summary-card">
          <div className="pedido-summary-heading">
            <ShoppingBag size={19} />
            <h2>Resumen de tu pedido</h2>
          </div>

          <div className="pedido-items">
            {order.order_item.map((item) => {
              const price = Number(item.price);
              const quantity = Number(item.quantity);
              const maturityLabel = getMaturityLabel(item.maturity_preference);

              return (
                <div key={item.id} className="pedido-item">
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>
                      {formatQuantity(quantity, item.unit)} × {formatCRC(price)}
                    </span>
                    {maturityLabel && <small>Maduración: {maturityLabel}</small>}
                  </div>
                  <strong>{formatCRC(price * quantity)}</strong>
                </div>
              );
            })}
          </div>

          {order.customer_notes && (
            <div className="pedido-notes">
              <span>Notas del pedido</span>
              <p>{order.customer_notes}</p>
            </div>
          )}

          <div className="pedido-totals">
            <div><span>Subtotal</span><strong>{formatCRC(order.subtotal)}</strong></div>
            <div><span>Envío</span><strong>{formatCRC(order.shipping)}</strong></div>
            <div className="pedido-total-row--final">
              <span>Total</span>
              <strong>{formatCRC(order.total)}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="pedido-actions">
        <Link href="/productos" className="pedido-primary-action">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
