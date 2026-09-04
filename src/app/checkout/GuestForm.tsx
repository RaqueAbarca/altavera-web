"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import LocationPicker from "@/components/checkout/LocationPicker";
import DeliveryDateSelector from "@/components/checkout/DeliveryDateSelector";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import { createOrder } from "./createOrder";
import type { GuestLocation, OrderInput } from "./types";
import {
  DELIVERY_UNAVAILABLE_MESSAGE,
  type DeliveryAvailability,
} from "@/lib/deliveryCoverage";
import {
  formatDeliveryDate,
  type DeliveryCycleSummary,
} from "@/lib/deliverySchedule";
import { getMaturityLabel } from "@/lib/maturity";
import { DELIVERY_FEE_CRC, formatCRC } from "@/lib/deliveryFee";
import type { PaymentMethod } from "@/lib/paymentMethods";

const SINPE_PHONE = process.env.NEXT_PUBLIC_SINPE_PHONE?.trim() ?? "";
const SINPE_HOLDER = process.env.NEXT_PUBLIC_SINPE_HOLDER?.trim() ?? "";
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME?.trim() ?? "";
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER?.trim() ?? "";
const BANK_IBAN = process.env.NEXT_PUBLIC_BANK_IBAN?.trim() ?? "";

export default function GuestForm() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const checkoutTotal = totalPrice + DELIVERY_FEE_CRC;

  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [requiresLegalConsent, setRequiresLegalConsent] = useState(true);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [copiedPaymentField, setCopiedPaymentField] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [location, setLocation] = useState<GuestLocation>({ lat: 0, lng: 0 });
  const [deliveryAvailability, setDeliveryAvailability] =
    useState<DeliveryAvailability | null>(null);
  const [deliveryCycles, setDeliveryCycles] = useState<DeliveryCycleSummary[]>([]);
  const [selectedDeliveryCycleId, setSelectedDeliveryCycleId] = useState("");
  const [deliveryCyclesLoading, setDeliveryCyclesLoading] = useState(true);
  const [deliveryCyclesError, setDeliveryCyclesError] = useState("");

  const selectedCycle = useMemo(
    () =>
      deliveryCycles.find((cycle) => cycle.id === selectedDeliveryCycleId) ?? null,
    [deliveryCycles, selectedDeliveryCycleId]
  );

  async function loadDeliveryCycles() {
    setDeliveryCyclesLoading(true);
    setDeliveryCyclesError("");

    try {
      const response = await fetch("/api/delivery-cycles/available", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las próximas entregas");
      }

      const cycles = (data.cycles ?? []) as DeliveryCycleSummary[];
      setDeliveryCycles(cycles);
      setSelectedDeliveryCycleId((current) =>
        cycles.some((cycle) => cycle.id === current)
          ? current
          : cycles[0]?.id ?? ""
      );
    } catch (error) {
      setDeliveryCycles([]);
      setSelectedDeliveryCycleId("");
      setDeliveryCyclesError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las próximas entregas"
      );
    } finally {
      setDeliveryCyclesLoading(false);
    }
  }

  useEffect(() => {
    void loadDeliveryCycles();
    const timer = window.setInterval(loadDeliveryCycles, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setCustomer((current) => ({
          ...current,
          name: session.user.user_metadata?.full_name || current.name,
          phone: session.user.user_metadata?.phone || current.phone,
          email: session.user.email || current.email,
        }));

        try {
          const response = await fetch("/api/consents/status", {
            cache: "no-store",
          });
          const data = await response.json();

          setRequiresLegalConsent(!data.legalAccepted);
          setMarketingOptIn(Boolean(data.marketingOptIn));
        } catch (error) {
          console.error("ERROR CONSULTANDO CONSENTIMIENTOS:", error);
          setRequiresLegalConsent(true);
        }
      } else {
        setRequiresLegalConsent(true);
      }

      setCheckingAuth(false);
    };

    void checkUser();
  }, []);

  function updateCustomer(field: keyof typeof customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    if (stepError) setStepError("");
  }

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyPaymentValue(key: string, value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedPaymentField(key);
      window.setTimeout(() => {
        setCopiedPaymentField((current) => (current === key ? "" : current));
      }, 1600);
    } catch {
      setStepError("No pudimos copiar ese dato automáticamente. Puedes seleccionarlo y copiarlo manualmente.");
    }
  }

  function validateDeliveryStep() {
    if (!customer.name.trim()) return "Ingresa tu nombre completo.";

    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      return "Ingresa un número de teléfono válido.";
    }

    if (
      customer.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
    ) {
      return "Revisa el correo electrónico ingresado.";
    }

    if (!selectedDeliveryCycleId) return "Selecciona una fecha de entrega.";

    if (location.lat === 0 && location.lng === 0) {
      return "Selecciona tu ubicación de entrega en el mapa.";
    }

    if (!deliveryAvailability?.available) return DELIVERY_UNAVAILABLE_MESSAGE;

    return "";
  }

  function handleContinueToPayment() {
    const error = validateDeliveryStep();
    if (error) {
      setStepError(error);
      return;
    }

    setStepError("");
    setStep(2);
    goToTop();
  }

  function handleBackToDelivery() {
    setStepError("");
    setStep(1);
    goToTop();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const deliveryError = validateDeliveryStep();
    if (deliveryError) {
      setStepError(deliveryError);
      setStep(1);
      goToTop();
      return;
    }

    if (cart.length === 0) {
      setStepError("Tu carrito está vacío.");
      return;
    }

    if (!paymentMethod) {
      setStepError("Selecciona cómo quieres realizar el pago.");
      return;
    }

    if (requiresLegalConsent && !legalAccepted) {
      setStepError("Debes aceptar los Términos y Condiciones para continuar.");
      return;
    }

    setStepError("");
    setLoading(true);

    try {
      const order: OrderInput = {
        guest_name: customer.name.trim(),
        guest_phone: customer.phone.trim(),
        guest_email: customer.email.trim() || null,
        latitude: location.lat,
        longitude: location.lng,
        address_description: customer.address.trim() || null,
        customer_notes: customer.notes.trim() || null,
        delivery_cycle_id: selectedDeliveryCycleId,
        payment_method: paymentMethod,
        legal_accepted: requiresLegalConsent ? legalAccepted : false,
        marketing_opt_in: requiresLegalConsent ? marketingOptIn : false,
      };

      const createdOrder = await createOrder({ order, cart });

      clearCart();
      router.push(`/pedido/${createdOrder.id}#token=${createdOrder.accessToken}`);
    } catch (error) {
      console.error("ERROR CREANDO PEDIDO:", error);

      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code === "DELIVERY_CUTOFF_PASSED"
      ) {
        await loadDeliveryCycles();
        setStep(1);
      }

      setStepError(
        error instanceof Error ? error.message : "Hubo un error creando el pedido."
      );
      goToTop();
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="checkout-loading">Preparando tu compra...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-empty">
        <h1>Tu carrito está vacío</h1>
        <p>Agrega algunos productos antes de continuar con el checkout.</p>
        <Link href="/productos" className="checkout-primary-action">
          Ver productos
        </Link>
      </div>
    );
  }

  const summary = (
    <aside className="checkout-summary" aria-label="Resumen del pedido">
      <div className="checkout-summary__heading">
        <span>Tu pedido</span>
        <h2>Resumen</h2>
      </div>

      <div className="checkout-summary__items">
        {cart.map((item) => {
          const maturityLabel = getMaturityLabel(item.maturity_preference);
          return (
            <div className="checkout-summary__item" key={item.id}>
              <div className="checkout-summary__image">
                <img src={item.image} alt="" />
                <span>{item.quantity}</span>
              </div>
              <div className="checkout-summary__item-copy">
                <strong>{item.name}</strong>
                <small>
                  {item.quantity.toLocaleString("es-CR")} {item.unit} × {formatCRC(item.price)}
                </small>
                {maturityLabel && <small>Maduración: {maturityLabel}</small>}
              </div>
              <strong className="checkout-summary__item-total">
                {formatCRC(item.price * item.quantity)}
              </strong>
            </div>
          );
        })}
      </div>

      <div className="checkout-summary__totals">
        <div>
          <span>Subtotal</span>
          <strong>{formatCRC(totalPrice)}</strong>
        </div>
        <div>
          <span>Envío</span>
          <strong>{formatCRC(DELIVERY_FEE_CRC)}</strong>
        </div>
        <div className="checkout-summary__grand-total">
          <span>Total</span>
          <strong>{formatCRC(checkoutTotal)}</strong>
        </div>
      </div>

      {selectedCycle && (
        <div className="checkout-summary__delivery">
          <span>Entrega seleccionada</span>
          <strong>{formatDeliveryDate(selectedCycle.delivery_date)}</strong>
        </div>
      )}
    </aside>
  );

  return (
    <form className="guest-form" onSubmit={handleSubmit} noValidate>
      <CheckoutStepper currentStep={step} />

      {stepError && (
        <div className="checkout-error" role="alert">
          {stepError}
        </div>
      )}

      <div className="checkout-mobile-summary">
        <details>
          <summary>
            <span>Ver resumen</span>
            <strong>{formatCRC(checkoutTotal)}</strong>
          </summary>
          {summary}
        </details>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-step" hidden={step !== 1}>
            <header className="checkout-step__header">
              <span>Paso 1 de 3</span>
              <h1>Datos de entrega</h1>
              <p>Necesitamos estos datos para coordinar la entrega de tu pedido.</p>
            </header>

            {!user && (
              <div className="checkout-login-note">
                <div>
                  <strong>¿Ya tienes una cuenta?</strong>
                  <span>Inicia sesión para autocompletar tus datos y seguir tu pedido.</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/login?redirect=checkout")}
                >
                  Iniciar sesión
                </button>
              </div>
            )}

            <div className="checkout-section">
              <div className="checkout-section__title">
                <h2>Información de contacto</h2>
              </div>

              <div className="checkout-field-grid checkout-field-grid--name">
                <label>
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(event) => updateCustomer("name", event.target.value)}
                    autoComplete="name"
                    placeholder="Ej: María Rodríguez"
                  />
                </label>
              </div>

              <div className="checkout-field-grid">
                <label>
                  <span>Teléfono / WhatsApp</span>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    autoComplete="tel"
                    placeholder="8888-8888"
                  />
                </label>

                <label>
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(event) => updateCustomer("email", event.target.value)}
                    autoComplete="email"
                    placeholder="correo@email.com"
                  />
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <DeliveryDateSelector
                cycles={deliveryCycles}
                selectedId={selectedDeliveryCycleId}
                loading={deliveryCyclesLoading}
                error={deliveryCyclesError}
                onChange={(cycleId) => {
                  setSelectedDeliveryCycleId(cycleId);
                  setStepError("");
                }}
              />
            </div>

            <div className="checkout-section">
              <div className="checkout-section__title">
                <h2>Dirección de entrega</h2>
                <p>Marca el punto exacto en el mapa. Por ahora entregamos en Alajuela.</p>
              </div>

              <LocationPicker
                onChange={(lat, lng, availability) => {
                  setLocation({ lat, lng });
                  setDeliveryAvailability(availability);
                  setStepError("");
                }}
              />

              <label className="checkout-textarea-field">
                <span>Descripción de la ubicación <em>Opcional</em></span>
                <textarea
                  value={customer.address}
                  onChange={(event) => updateCustomer("address", event.target.value)}
                  placeholder="Condominio, número de casa, color del portón, 100 m norte de..."
                />
              </label>

              <label className="checkout-textarea-field">
                <span>Notas para tu pedido <em>Opcional</em></span>
                <textarea
                  value={customer.notes}
                  onChange={(event) => updateCustomer("notes", event.target.value)}
                  maxLength={1000}
                  placeholder="Ej: si falta un producto no sustituirlo, dejar en recepción..."
                />
                <small>La maduración de cada producto se selecciona desde el carrito.</small>
              </label>
            </div>

            <div className="checkout-step-actions checkout-step-actions--end">
              <button
                type="button"
                className="checkout-primary-action"
                onClick={handleContinueToPayment}
                disabled={deliveryCyclesLoading}
              >
                Continuar al pago
                <ArrowRight size={18} />
              </button>
            </div>
          </section>

          <section className="checkout-step" hidden={step !== 2}>
            <header className="checkout-step__header">
              <span>Paso 2 de 3</span>
              <h1>Pago</h1>
              <p>Elige cómo quieres pagar. Tu pedido quedará reservado mientras verificamos el pago.</p>
            </header>

            <div className="checkout-section">
              <div className="checkout-section__title">
                <h2>Método de pago</h2>
                <p>Selecciona la opción que te resulte más cómoda.</p>
              </div>

              <div className="payment-methods">
                <label className={`payment-method ${paymentMethod === "SINPE" ? "payment-method--selected" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="SINPE"
                    checked={paymentMethod === "SINPE"}
                    onChange={() => {
                      setPaymentMethod("SINPE");
                      setStepError("");
                    }}
                  />
                  <span className="payment-method__icon"><Smartphone size={22} /></span>
                  <span className="payment-method__copy">
                    <strong>SINPE Móvil</strong>
                    <small>Te mostraremos el número, titular y monto para realizar el pago.</small>
                  </span>
                  <span className="payment-method__radio" aria-hidden="true" />
                </label>

                <label className={`payment-method ${paymentMethod === "BANK_TRANSFER" ? "payment-method--selected" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="BANK_TRANSFER"
                    checked={paymentMethod === "BANK_TRANSFER"}
                    onChange={() => {
                      setPaymentMethod("BANK_TRANSFER");
                      setStepError("");
                    }}
                  />
                  <span className="payment-method__icon"><Building2 size={22} /></span>
                  <span className="payment-method__copy">
                    <strong>Transferencia bancaria</strong>
                    <small>Te mostraremos la cuenta IBAN y los datos necesarios para transferir.</small>
                  </span>
                  <span className="payment-method__radio" aria-hidden="true" />
                </label>
              </div>

              {paymentMethod && (
                <div className="payment-details-card" aria-live="polite">
                  <div className="payment-details-card__heading">
                    <div>
                      <span>Datos para pagar</span>
                      <h3>{paymentMethod === "SINPE" ? "SINPE Móvil" : "Transferencia bancaria"}</h3>
                    </div>
                    <strong>{formatCRC(checkoutTotal)}</strong>
                  </div>

                  <div className="payment-details-card__rows">
                    {paymentMethod === "SINPE" ? (
                      <>
                        {SINPE_PHONE ? (
                          <div className="payment-detail-row">
                            <div><span>Número</span><strong>{SINPE_PHONE}</strong></div>
                            <button type="button" onClick={() => copyPaymentValue("sinpe", SINPE_PHONE)}>
                              {copiedPaymentField === "sinpe" ? <Check size={16} /> : <Copy size={16} />}
                              {copiedPaymentField === "sinpe" ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                        ) : null}
                        {SINPE_HOLDER ? (
                          <div className="payment-detail-row payment-detail-row--plain">
                            <div><span>Titular</span><strong>{SINPE_HOLDER}</strong></div>
                          </div>
                        ) : null}
                        {!SINPE_PHONE && !SINPE_HOLDER && (
                          <p className="payment-details-card__pending">
                            Los datos del SINPE Móvil todavía están pendientes de configurar.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {BANK_NAME ? (
                          <div className="payment-detail-row payment-detail-row--plain">
                            <div><span>Banco</span><strong>{BANK_NAME}</strong></div>
                          </div>
                        ) : null}
                        {BANK_HOLDER ? (
                          <div className="payment-detail-row payment-detail-row--plain">
                            <div><span>Titular</span><strong>{BANK_HOLDER}</strong></div>
                          </div>
                        ) : null}
                        {BANK_IBAN ? (
                          <div className="payment-detail-row">
                            <div><span>IBAN</span><strong>{BANK_IBAN}</strong></div>
                            <button type="button" onClick={() => copyPaymentValue("iban", BANK_IBAN)}>
                              {copiedPaymentField === "iban" ? <Check size={16} /> : <Copy size={16} />}
                              {copiedPaymentField === "iban" ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                        ) : null}
                        {!BANK_NAME && !BANK_HOLDER && !BANK_IBAN && (
                          <p className="payment-details-card__pending">
                            Los datos de la cuenta bancaria todavía están pendientes de configurar.
                          </p>
                        )}
                      </>
                    )}

                    <div className="payment-detail-row payment-detail-row--amount">
                      <div><span>Monto exacto</span><strong>{formatCRC(checkoutTotal)}</strong></div>
                      <button type="button" onClick={() => copyPaymentValue("amount", formatCRC(checkoutTotal))}>
                        {copiedPaymentField === "amount" ? <Check size={16} /> : <Copy size={16} />}
                        {copiedPaymentField === "amount" ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  <div className="payment-proof-reminder">
                    <MessageCircle size={19} />
                    <div>
                      <strong>Guarda el comprobante</strong>
                      <p>
                        Después de crear tu pedido te daremos un botón para enviarlo por WhatsApp. Tu pago seguirá pendiente hasta que Altavera lo verifique.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {requiresLegalConsent && (
              <section className="checkout-consents" aria-labelledby="checkout-consents-title">
                <div className="checkout-section__title">
                  <h2 id="checkout-consents-title">Antes de confirmar</h2>
                </div>

                <label className="checkout-consent checkout-consent--required">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => {
                      setLegalAccepted(event.target.checked);
                      setStepError("");
                    }}
                  />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos-y-condiciones" target="_blank">
                      Términos y Condiciones
                    </Link>{" "}
                    y confirmo haber leído la{" "}
                    <Link href="/privacidad" target="_blank">
                      Política de Privacidad
                    </Link>.
                  </span>
                </label>

                <label className="checkout-consent">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(event) => setMarketingOptIn(event.target.checked)}
                  />
                  <span>
                    Acepto recibir ofertas y novedades de Altavera por correo electrónico y/o WhatsApp.
                    <small>Opcional</small>
                  </span>
                </label>
              </section>
            )}

            <div className="checkout-step-actions">
              <button
                type="button"
                className="checkout-secondary-action"
                onClick={handleBackToDelivery}
              >
                <ArrowLeft size={18} />
                Volver
              </button>

              <button
                type="submit"
                className="checkout-primary-action"
                disabled={loading || !paymentMethod || (requiresLegalConsent && !legalAccepted)}
              >
                {loading ? "Creando pedido..." : `Confirmar pedido · ${formatCRC(checkoutTotal)}`}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          </section>
        </div>

        <div className="checkout-desktop-summary">{summary}</div>
      </div>
    </form>
  );
}
