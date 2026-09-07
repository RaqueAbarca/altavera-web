"use client";

import Link from "next/link";
import "./contacto.css";
import CoverageMap from "@/components/coverage/CoverageMap";
import { usePublicAppSettings } from "@/hooks/usePublicAppSettings";
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from "@/lib/whatsapp";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaShoppingBasket,
  FaClipboardList,
  FaTruck,
  FaQuestionCircle,
  FaArrowRight,
} from "react-icons/fa";

const quickQuestions = [
  {
    title: "Duda sobre un producto",
    message: "Hola, tengo una consulta sobre un producto de Altavera.",
    icon: FaShoppingBasket,
  },
  {
    title: "Consulta sobre mi pedido",
    message: "Hola, tengo una consulta sobre mi pedido de Altavera.",
    icon: FaClipboardList,
  },
  {
    title: "Consulta sobre entregas",
    message: "Hola, tengo una consulta sobre las entregas y la zona de cobertura de Altavera.",
    icon: FaTruck,
  },
  {
    title: "Otra consulta",
    message: "Hola, tengo una consulta sobre Altavera.",
    icon: FaQuestionCircle,
  },
];

function displayPhone(value: string) {
  const normalized = normalizeWhatsAppPhone(value);
  if (!normalized) return value;
  const local = normalized.startsWith("506") && normalized.length === 11
    ? normalized.slice(3)
    : normalized;
  return local.length === 8 ? `${local.slice(0, 4)} ${local.slice(4)}` : value;
}

export default function ContactPage() {
  const { settings, loading } = usePublicAppSettings();
  const whatsappPhone = settings.contact.whatsappPhone;
  const contactEmail = settings.contact.email;
  const normalizedPhone = normalizeWhatsAppPhone(whatsappPhone);

  function whatsappUrl(message: string) {
    return buildWhatsAppUrl({ phone: whatsappPhone, message });
  }

  const generalWhatsappUrl = whatsappUrl("Hola, tengo una consulta sobre Altavera.");

  return (
    <main className="contact-page container">
      <section className="contact-hero">
        <div className="contact-info">
          <h1>Contáctanos</h1>

          <p className="subtitle">
            ¿Tienes alguna pregunta sobre nuestros productos, pedidos o entregas?
            Estamos para ayudarte.
          </p>

          <nav className="breadcrumb" aria-label="Navegación secundaria">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">›</span>
            <span>Contacto</span>
          </nav>

          <div className="info-list">
            {generalWhatsappUrl && (
              <a
                className="info-item info-item-link"
                href={generalWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Escribir a Altavera por WhatsApp"
              >
                <FaWhatsapp />
                <div>
                  <strong>WhatsApp</strong>
                  <p>{displayPhone(whatsappPhone)}</p>
                </div>
              </a>
            )}

            {normalizedPhone && (
              <a
                className="info-item info-item-link"
                href={`tel:+${normalizedPhone}`}
                aria-label="Llamar a Altavera"
              >
                <FaPhoneAlt />
                <div>
                  <strong>Teléfono</strong>
                  <p>{displayPhone(whatsappPhone)}</p>
                </div>
              </a>
            )}

            {contactEmail && (
              <a
                className="info-item info-item-link"
                href={`mailto:${contactEmail}`}
                aria-label="Enviar correo a Altavera"
              >
                <FaEnvelope />
                <div>
                  <strong>Correo</strong>
                  <p>{contactEmail}</p>
                </div>
              </a>
            )}

            <a className="info-item info-item-link" href="#coverage-map">
              <FaMapMarkerAlt />
              <div>
                <strong>Zona de cobertura</strong>
                <p>Consulta en el mapa nuestra zona de entrega actual.</p>
              </div>
            </a>
          </div>

          {!loading && !generalWhatsappUrl && !contactEmail && (
            <p className="contact-actions-note">
              Nuestros canales oficiales de atención se publicarán aquí cuando estén habilitados.
            </p>
          )}
        </div>

        <div className="contact-actions-card">
          <div className="contact-actions-heading">
            <span className="whatsapp-icon" aria-hidden="true">
              <FaWhatsapp />
            </span>
            <div>
              <h2>¿En qué podemos ayudarte?</h2>
              <p>
                {generalWhatsappUrl
                  ? "Elige una opción y te llevamos directo a WhatsApp con el mensaje listo para enviar."
                  : "Cuando habilitemos nuestro WhatsApp oficial podrás iniciar una consulta desde aquí."}
              </p>
            </div>
          </div>

          {generalWhatsappUrl && (
            <>
              <div className="quick-question-list">
                {quickQuestions.map(({ title, message, icon: Icon }) => {
                  const href = whatsappUrl(message);
                  if (!href) return null;

                  return (
                    <a
                      key={title}
                      className="quick-question"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="quick-question-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span>{title}</span>
                      <FaArrowRight className="quick-question-arrow" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>

              <a
                className="whatsapp-main-button"
                href={generalWhatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp aria-hidden="true" />
                Escribir por WhatsApp
              </a>

              <p className="contact-actions-note">
                Se abrirá una conversación con Altavera en WhatsApp.
              </p>
            </>
          )}
        </div>

        <div className="contact-image">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=700"
            alt="Canasta con productos frescos"
          />
          <div className="orange-blob" aria-hidden="true"></div>
        </div>
      </section>

      <section className="coverage-section" id="coverage-map">
        <div className="coverage-heading">
          <span className="coverage-kicker">Entregas</span>
          <h2>¿Llegamos hasta tu zona?</h2>
          <p>Consulta en el mapa nuestra zona de entrega actual.</p>
        </div>

        <div className="map-section" aria-label="Mapa de cobertura de Altavera">
          <CoverageMap />
        </div>

        <div className="coverage-suggestion">
          <div>
            <h3>¿Todavía no llegamos hasta tu zona?</h3>
            <p>Contanos dónde te gustaría que Altavera amplíe sus entregas.</p>
          </div>
          {whatsappUrl(
            "Hola, me gustaría proponer una nueva zona de entrega para Altavera. La ubicación es:"
          ) ? (
            <a
              className="coverage-suggestion-button"
              href={whatsappUrl(
                "Hola, me gustaría proponer una nueva zona de entrega para Altavera. La ubicación es:"
              )!}
              target="_blank"
              rel="noreferrer"
            >
              <FaMapMarkerAlt aria-hidden="true" />
              Proponer una nueva zona
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
