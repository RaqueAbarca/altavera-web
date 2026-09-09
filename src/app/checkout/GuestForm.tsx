"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import { usePublicAppSettings } from "@/hooks/usePublicAppSettings";
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
import { formatCRC } from "@/lib/deliveryFee";
import type { PaymentMethod } from "@/lib/paymentMethods";
import type { SavedAddress } from "@/types/address";

export default function GuestForm() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const { settings, loading: settingsLoading, error: settingsError } =
    usePublicAppSettings();
  const deliveryFee = settings.delivery.flatFeeCrc;
  const deliveryConfigured = settings.delivery.configured;
  const checkoutTotal = totalPrice + (deliveryFee ?? 0);
  const SINPE_PHONE = settings.payment.sinpePhone;
  const SINPE_HOLDER = settings.payment.sinpeHolder;
  const BANK_ACCOUNTS = settings.payment.bankAccounts.filter(
    (account) => account.accountNumber || account.iban
  );
  const sinpeAvailable = Boolean(SINPE_PHONE);
  const bankTransferAvailable = BANK_ACCOUNTS.length > 0;

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
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(true);
  const [savedAddressChecking, setSavedAddressChecking] = useState(false);
  const [savedAddressValidationError, setSavedAddressValidationError] = useState("");
  const [newAddressLabel, setNewAddressLabel] = useState("Casa");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState("");
  const savedAddressCheckIdRef = useRef(0);

  const selectedCycle = useMemo(
    () =>
      deliveryCycles.find((cycle) => cycle.id === selectedDeliveryCycleId) ?? null,
    [deliveryCycles, selectedDeliveryCycleId]
  );

  async function loadSavedAddresses(selectDefault = false) {
    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar tus direcciones");
      }

      const addresses = (data.addresses ?? []) as SavedAddress[];
      setSavedAddresses(addresses);

      if (selectDefault && addresses.length > 0) {
        const preferred = addresses.find((address) => address.is_default) ?? addresses[0];
        setSelectedSavedAddressId(preferred.id);
        setShowLocationPicker(false);
        setLocation({ lat: Number(preferred.latitude), lng: Number(preferred.longitude) });
        setCustomer((current) => ({
          ...current,
          address: preferred.address_description ?? "",
        }));
        void validateSavedAddress(preferred);
      } else if (selectDefault) {
        setShowLocationPicker(true);
      }

      return addresses;
    } catch (error) {
      console.error("ERROR CARGANDO DIRECCIONES GUARDADAS:", error);
      setSavedAddresses([]);
      return [] as SavedAddress[];
    }
  }

  async function loadDeliveryCycles(silent = false) {
    if (!silent) {
      setDeliveryCyclesLoading(true);
      setDeliveryCyclesError("");
    }

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
      setDeliveryCyclesError("");
    } catch (error) {
      if (!silent) {
        setDeliveryCycles([]);
        setSelectedDeliveryCycleId("");
        setDeliveryCyclesError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las próximas entregas"
        );
      } else {
        console.error("ERROR ACTUALIZANDO FECHAS DE ENTREGA:", error);
      }
    } finally {
      if (!silent) setDeliveryCyclesLoading(false);
    }
  }

  useEffect(() => {
    void loadDeliveryCycles();
    const timer = window.setInterval(() => {
      void loadDeliveryCycles(true);
    }, 60_000);
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

        await loadSavedAddresses(true);

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

  async function validateSavedAddress(address: SavedAddress) {
    const requestId = ++savedAddressCheckIdRef.current;
    setDeliveryAvailability(null);
    setSavedAddressChecking(true);
    setSavedAddressValidationError("");

    try {
      const response = await fetch("/api/delivery/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(address.latitude),
          longitude: Number(address.longitude),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo validar la ubicación");
      }

      if (requestId !== savedAddressCheckIdRef.current) return;

      setDeliveryAvailability({
        available: Boolean(data.available),
        status: data.available ? "covered" : "outside",
        zone: data.available && typeof data.zone === "string" ? data.zone : null,
      });
    } catch (error) {
      if (requestId !== savedAddressCheckIdRef.current) return;

      setDeliveryAvailability({
        available: false,
        status: "outside",
        zone: null,
      });
      setSavedAddressValidationError(
        error instanceof Error
          ? error.message
          : "No se pudo validar esta dirección."
      );
    } finally {
      if (requestId === savedAddressCheckIdRef.current) {
        setSavedAddressChecking(false);
      }
    }
  }

  function selectSavedAddress(address: SavedAddress) {
    const nextLocation = {
      lat: Number(address.latitude),
      lng: Number(address.longitude),
    };

    setSelectedSavedAddressId(address.id);
    setShowLocationPicker(false);
    setLocation(nextLocation);
    void validateSavedAddress(address);
    setCustomer((current) => ({
      ...current,
      address: address.address_description ?? "",
    }));
    setAddressFeedback("");
    setStepError("");
  }

  function useNewAddress() {
    savedAddressCheckIdRef.current += 1;
    setSelectedSavedAddressId("");
    setShowLocationPicker(true);
    setSavedAddressChecking(false);
    setSavedAddressValidationError("");
    setLocation({ lat: 0, lng: 0 });
    setDeliveryAvailability(null);
    setCustomer((current) => ({ ...current, address: "" }));
    setAddressFeedback("");
    setStepError("");
  }

  async function saveCurrentAddress() {
    if (!user || !deliveryAvailability?.available || savingAddress) return;

    setSavingAddress(true);
    setAddressFeedback("");

    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newAddressLabel.trim() || "Mi dirección",
          latitude: location.lat,
          longitude: location.lng,
          address_description: customer.address.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la dirección");
      }

      await loadSavedAddresses(false);
      setSelectedSavedAddressId(data.address.id);
      setShowLocationPicker(false);
      setSavedAddressValidationError("");
      setNewAddressLabel("Casa");
      setAddressFeedback("Dirección guardada para tus próximos pedidos.");
    } catch (error) {
      setAddressFeedback(
        error instanceof Error ? error.message : "No se pudo guardar la dirección."
      );
    } finally {
      setSavingAddress(false);
    }
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

    if (!deliveryConfigured || deliveryFee === null) {
      setStepError(
        "La tarifa de envío todavía no está disponible. Intenta nuevamente en unos minutos."
      );
      return;
    }

    if (!paymentMethod) {
      setStepError("Selecciona cómo quieres realizar el pago.");
      return;
    }

    if (
      (paymentMethod === "SINPE" && !sinpeAvailable) ||
      (paymentMethod === "BANK_TRANSFER" && !bankTransferAvailable)
    ) {
      setStepError("El método de pago seleccionado no está disponible en este momento.");
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

  if (checkingAuth || settingsLoading) {
    return <div className="checkout-loading">Preparando tu compra...</div>;
  }

  if (settingsError || !deliveryConfigured || deliveryFee === null) {
    return (
      <div className="checkout-empty">
        <h1>El checkout está temporalmente pausado</h1>
        <p>
          {settingsError
            ? "No pudimos cargar la configuración de la tienda. Intenta nuevamente en unos minutos."
            : "La tarifa de envío todavía no está configurada. Altavera debe definirla antes de recibir pedidos."}
        </p>
        <Link href="/carrito" className="checkout-primary-action">
          Volver al carrito
        </Link>
      </div>
    );
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
          <strong>{formatCRC(deliveryFee)}</strong>
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
                  <small className="checkout-field-help">
                    Si agregas un correo, te enviaremos automáticamente la confirmación y el resumen de este pedido.
                  </small>
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

            <div className="checkout-section checkout-section--address-card">
              <div className="checkout-section__title">
                <h2>Dirección de entrega</h2>
                <p>
                  {user && savedAddresses.length > 0 && !showLocationPicker
                    ? "Elige una dirección guardada para este pedido."
                    : "Marca el punto exacto en el mapa. Por ahora entregamos en Alajuela."}
                </p>
              </div>

              {user && savedAddresses.length > 0 && (
                <div className="checkout-saved-addresses">
                  <div className="checkout-saved-addresses__heading">
                    <div>
                      <strong>Tus direcciones guardadas</strong>
                      <span>Elige una o marca una ubicación nueva.</span>
                    </div>
                    <Link href="/profile#direcciones">Administrar</Link>
                  </div>

                  <div className="checkout-saved-addresses__list">
                    {savedAddresses.map((address) => (
                      <button
                        type="button"
                        key={address.id}
                        className={`checkout-saved-address ${
                          selectedSavedAddressId === address.id
                            ? "checkout-saved-address--selected"
                            : ""
                        }`}
                        onClick={() => selectSavedAddress(address)}
                      >
                        <MapPin size={17} aria-hidden="true" />
                        <span>
                          <strong>{address.label}</strong>
                          <small>
                            {address.address_description || "Ubicación guardada en el mapa"}
                          </small>
                        </span>
                        {address.is_default && <em>Principal</em>}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`checkout-saved-address checkout-saved-address--new ${
                        showLocationPicker && !selectedSavedAddressId
                          ? "checkout-saved-address--selected"
                          : ""
                      }`}
                      onClick={useNewAddress}
                    >
                      <span className="checkout-saved-address__plus">+</span>
                      <span>
                        <strong>Agregar otra ubicación</strong>
                        <small>Abrir el mapa y marcar un punto</small>
                      </span>
                    </button>
                  </div>

                  {selectedSavedAddressId && !showLocationPicker && (
                    <div
                      className={`checkout-saved-address-status ${
                        deliveryAvailability?.available
                          ? "checkout-saved-address-status--available"
                          : deliveryAvailability
                            ? "checkout-saved-address-status--unavailable"
                            : "checkout-saved-address-status--checking"
                      }`}
                      role="status"
                    >
                      {savedAddressChecking
                        ? "Validando cobertura de esta dirección..."
                        : savedAddressValidationError
                          ? savedAddressValidationError
                          : deliveryAvailability?.available
                            ? `Dirección dentro de cobertura${
                                deliveryAvailability.zone ? ` · ${deliveryAvailability.zone}` : ""
                              }`
                            : "Esta dirección ya no está dentro de nuestra cobertura. Elige otra ubicación."}
                    </div>
                  )}
                </div>
              )}

              {(!user || savedAddresses.length === 0 || showLocationPicker) && (
                <>
                  <LocationPicker
                    value={
                      location.lat === 0 && location.lng === 0
                        ? null
                        : location
                    }
                    autoLocate={!user || savedAddresses.length === 0}
                    onChange={(lat, lng, availability) => {
                      setLocation({ lat, lng });
                      setDeliveryAvailability(availability);

                      if (selectedSavedAddressId) {
                        const selectedAddress = savedAddresses.find(
                          (address) => address.id === selectedSavedAddressId
                        );
                        const stillSelected =
                          selectedAddress &&
                          Math.abs(Number(selectedAddress.latitude) - lat) < 0.0000001 &&
                          Math.abs(Number(selectedAddress.longitude) - lng) < 0.0000001;

                        if (!stillSelected) setSelectedSavedAddressId("");
                      }

                      setAddressFeedback("");
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

                  {user && deliveryAvailability?.available && !selectedSavedAddressId && (
                    <div className="checkout-save-address">
                      <div className="checkout-save-address__copy">
                        <strong>Guardar para la próxima</strong>
                        <span>Ponle un nombre como Casa, Trabajo o Apartamento.</span>
                      </div>
                      <div className="checkout-save-address__actions">
                        <input
                          type="text"
                          value={newAddressLabel}
                          onChange={(event) => setNewAddressLabel(event.target.value)}
                          maxLength={50}
                          placeholder="Ej: Casa"
                          aria-label="Nombre para guardar la dirección"
                        />
                        <button
                          type="button"
                          onClick={() => void saveCurrentAddress()}
                          disabled={savingAddress}
                        >
                          {savingAddress ? "Guardando..." : "Guardar dirección"}
                        </button>
                      </div>
                    </div>
                  )}

                </>
              )}

              {user && addressFeedback && (
                <p className="checkout-address-feedback" role="status">
                  {addressFeedback}
                </p>
              )}
            </div>

            <div className="checkout-section checkout-section--order-notes">
              <label className="checkout-textarea-field">
                <span>Notas para tu pedido <em>Opcional</em></span>
                <textarea
                  value={customer.notes}
                  onChange={(event) => updateCustomer("notes", event.target.value)}
                  maxLength={1000}
                  placeholder="Ej: si falta un producto no sustituirlo, dejar en recepción..."
                />
                <small>La maduración se puede elegir al agregar el producto y también ajustarla desde el carrito.</small>
              </label>
            </div>

            <div className="checkout-step-actions checkout-step-actions--end">
              <button
                type="button"
                className="checkout-primary-action"
                onClick={handleContinueToPayment}
                disabled={
                  deliveryCyclesLoading ||
                  location.lat === 0 ||
                  location.lng === 0 ||
                  deliveryAvailability?.available !== true
                }
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
                <label className={`payment-method ${paymentMethod === "SINPE" ? "payment-method--selected" : ""} ${!sinpeAvailable ? "payment-method--disabled" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="SINPE"
                    checked={paymentMethod === "SINPE"}
                    disabled={!sinpeAvailable}
                    onChange={() => {
                      setPaymentMethod("SINPE");
                      setStepError("");
                    }}
                  />
                  <span className="payment-method__icon"><Smartphone size={22} /></span>
                  <span className="payment-method__copy">
                    <strong>SINPE Móvil</strong>
                    <small>
                      {sinpeAvailable
                        ? "Te mostraremos el número, titular y monto para realizar el pago."
                        : "No disponible temporalmente."}
                    </small>
                  </span>
                  <span className="payment-method__radio" aria-hidden="true" />
                </label>

                <label className={`payment-method ${paymentMethod === "BANK_TRANSFER" ? "payment-method--selected" : ""} ${!bankTransferAvailable ? "payment-method--disabled" : ""}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="BANK_TRANSFER"
                    checked={paymentMethod === "BANK_TRANSFER"}
                    disabled={!bankTransferAvailable}
                    onChange={() => {
                      setPaymentMethod("BANK_TRANSFER");
                      setStepError("");
                    }}
                  />
                  <span className="payment-method__icon"><Building2 size={22} /></span>
                  <span className="payment-method__copy">
                    <strong>Transferencia bancaria</strong>
                    <small>
                      {bankTransferAvailable
                        ? "Elige la cuenta bancaria que te resulte más conveniente para transferir."
                        : "No disponible temporalmente."}
                    </small>
                  </span>
                  <span className="payment-method__radio" aria-hidden="true" />
                </label>
              </div>

              {!sinpeAvailable && !bankTransferAvailable && (
                <div className="checkout-error" role="status">
                  Los métodos de pago todavía no están configurados. Intenta nuevamente más tarde.
                </div>
              )}

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
                        {BANK_ACCOUNTS.length > 0 ? (
                          <div className="payment-bank-accounts">
                            {BANK_ACCOUNTS.map((account, index) => (
                              <section className="payment-bank-account" key={`${account.bankName}-${index}`}>
                                <div className="payment-bank-account__heading">
                                  <Building2 size={18} />
                                  <div>
                                    <span>Cuenta {index + 1}</span>
                                    <strong>{account.bankName || `Cuenta bancaria ${index + 1}`}</strong>
                                  </div>
                                </div>

                                {account.accountHolder ? (
                                  <div className="payment-detail-row payment-detail-row--plain">
                                    <div><span>Titular</span><strong>{account.accountHolder}</strong></div>
                                  </div>
                                ) : null}

                                {account.accountNumber ? (
                                  <div className="payment-detail-row">
                                    <div><span>Número de cuenta</span><strong>{account.accountNumber}</strong></div>
                                    <button type="button" onClick={() => copyPaymentValue(`account-${index}`, account.accountNumber)}>
                                      {copiedPaymentField === `account-${index}` ? <Check size={16} /> : <Copy size={16} />}
                                      {copiedPaymentField === `account-${index}` ? "Copiado" : "Copiar"}
                                    </button>
                                  </div>
                                ) : null}

                                {account.iban ? (
                                  <div className="payment-detail-row">
                                    <div><span>IBAN</span><strong>{account.iban}</strong></div>
                                    <button type="button" onClick={() => copyPaymentValue(`iban-${index}`, account.iban)}>
                                      {copiedPaymentField === `iban-${index}` ? <Check size={16} /> : <Copy size={16} />}
                                      {copiedPaymentField === `iban-${index}` ? "Copiado" : "Copiar"}
                                    </button>
                                  </div>
                                ) : null}
                              </section>
                            ))}
                          </div>
                        ) : (
                          <p className="payment-details-card__pending">
                            Los datos de las cuentas bancarias todavía están pendientes de configurar.
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
