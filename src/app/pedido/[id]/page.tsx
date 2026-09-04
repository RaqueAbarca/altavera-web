"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
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
import "./pedido.css";

type OrderItem = {
  id: string;
  product_name: string;
  price: number | string;
  quantity: number | string;
  maturity_preference: string | null;
};

type Order = {
  id: string;
  customer_notes: string | null;
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

export default function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sinpePhone = process.env.NEXT_PUBLIC_SINPE_PHONE?.trim();
  const bankName = process.env.NEXT_PUBLIC_BANK_NAME?.trim();
  const bankIban = process.env.NEXT_PUBLIC_BANK_IBAN?.trim();
  const bankHolder = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER?.trim();
  const isBankTransfer = order.payment_method === "BANK_TRANSFER";
  const paymentMethodLabel = getPaymentMethodLabel(order.payment_method);
  const receiptWhatsAppPhone =
    process.env.NEXT_PUBLIC_ALTAVERA_WHATSAPP?.trim() || "50686526792";
  const paymentProofUrl = buildWhatsAppUrl({
    phone: receiptWhatsAppPhone,
    message: buildPaymentProofMessage({
      orderId: order.id,
      total: formatCRC(order.total),
      paymentMethod: paymentMethodLabel,
    }),
  });

  return (
    <main className="container pedido-page">
      <CheckoutStepper currentStep={3} />

      <section className="pedido-confirmation-hero">
        <div className="pedido-confirmation-icon" aria-hidden="true">
          <CheckCircle2 size={32} />
        </div>
        <span>Paso 3 de 3</span>
        <h1>¡Pedido recibido!</h1>
        <p>
          Tu pedido quedó registrado correctamente. Ahora solo falta completar y verificar el pago.
        </p>
      </section>

      <div className="pedido-layout">
        <section className="pedido-card pedido-card--main">
          <div className="pedido-number">
            <span>Número de pedido</span>
            <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
          </div>

          <div className="pedido-facts">
            {order.delivery_cycle?.delivery_date && (
              <div>
                <CalendarDays size={20} />
                <span>Entrega</span>
                <strong>{formatDeliveryDate(order.delivery_cycle.delivery_date)}</strong>
              </div>
            )}

            <div>
              <WalletCards size={20} />
              <span>Método de pago</span>
              <strong>{paymentMethodLabel}</strong>
            </div>

            {order.address_description && (
              <div>
                <MapPin size={20} />
                <span>Referencia</span>
                <strong>{order.address_description}</strong>
              </div>
            )}
          </div>

          <div className="pedido-payment-box">
            <div className="pedido-payment-box__heading">
              <WalletCards size={20} />
              <div>
                <span>Pago pendiente</span>
                <h2>{paymentMethodLabel}</h2>
              </div>
            </div>

            {isBankTransfer ? (
              bankIban || bankName || bankHolder ? (
                <div className="pedido-payment-details">
                  {bankName && <p><span>Banco</span><strong>{bankName}</strong></p>}
                  {bankHolder && <p><span>Titular</span><strong>{bankHolder}</strong></p>}
                  {bankIban && <p><span>IBAN</span><strong>{bankIban}</strong></p>}
                  <p><span>Monto</span><strong>{formatCRC(order.total)}</strong></p>
                </div>
              ) : (
                <p>
                  Los datos de la transferencia todavía están pendientes de configurar. Tu pedido seguirá como pago pendiente hasta que Altavera lo verifique.
                </p>
              )
            ) : sinpePhone ? (
              <div className="pedido-payment-details">
                <p><span>SINPE Móvil</span><strong>{sinpePhone}</strong></p>
                <p><span>Monto</span><strong>{formatCRC(order.total)}</strong></p>
              </div>
            ) : (
              <p>
                Los datos del SINPE Móvil todavía están pendientes de configurar. Tu pedido seguirá como pago pendiente hasta que Altavera lo verifique.
              </p>
            )}

            <div className="pedido-proof-reminder">
              <MessageCircle size={22} />
              <div>
                <span>Último paso</span>
                <h3>Envíanos el comprobante por WhatsApp</h3>
                <p>
                  Tu pedido ya fue creado, pero el pago continúa pendiente. Adjunta la captura del comprobante en WhatsApp y lo verificaremos antes de preparar el pedido.
                </p>
                {paymentProofUrl && (
                  <a
                    href={paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pedido-whatsapp-action"
                  >
                    <MessageCircle size={18} />
                    Enviar comprobante por WhatsApp
                  </a>
                )}
                <small>
                  El mensaje llevará listo tu número de pedido, monto y método de pago. Solo tendrás que adjuntar la captura y enviarla.
                </small>
              </div>
            </div>
          </div>
        </section>

        <aside className="pedido-card pedido-summary-card">
          <div className="pedido-summary-heading">
            <ShoppingBag size={19} />
            <h2>Resumen</h2>
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
                      {quantity} × {formatCRC(price)}
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
