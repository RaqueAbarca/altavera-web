import Link from "next/link";
import "./contacto.css";
import CoverageMap from "@/components/coverage/CoverageMap";
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

const WHATSAPP_NUMBER = "50686526792";

function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

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
    message: "Hola, tengo una consulta sobre las entregas y zonas de cobertura de Altavera.",
    icon: FaTruck,
  },
  {
    title: "Otra consulta",
    message: "Hola, tengo una consulta sobre Altavera.",
    icon: FaQuestionCircle,
  },
];

export default function ContactPage() {
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
            <a
              className="info-item info-item-link"
              href={whatsappUrl("Hola, tengo una consulta sobre Altavera.")}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribir a Altavera por WhatsApp"
            >
              <FaWhatsapp />
              <div>
                <strong>WhatsApp</strong>
                <p>8652 6792</p>
              </div>
            </a>

            <a
              className="info-item info-item-link"
              href="tel:+50686526792"
              aria-label="Llamar a Altavera"
            >
              <FaPhoneAlt />
              <div>
                <strong>Teléfono</strong>
                <p>8652 6792</p>
              </div>
            </a>

            <a
              className="info-item info-item-link"
              href="mailto:hola@altavera.cr"
              aria-label="Enviar correo a Altavera"
            >
              <FaEnvelope />
              <div>
                <strong>Correo</strong>
                <p>hola@altavera.cr</p>
              </div>
            </a>

            <a className="info-item info-item-link" href="#coverage-map">
              <FaMapMarkerAlt />
              <div>
                <strong>Zona de cobertura</strong>
                <p>Consulta en el mapa nuestras zonas de entrega actuales.</p>
              </div>
            </a>
          </div>
        </div>

        <div className="contact-actions-card">
          <div className="contact-actions-heading">
            <span className="whatsapp-icon" aria-hidden="true">
              <FaWhatsapp />
            </span>
            <div>
              <h2>¿En qué podemos ayudarte?</h2>
              <p>
                Elige una opción y te llevamos directo a WhatsApp con el mensaje
                listo para enviar.
              </p>
            </div>
          </div>

          <div className="quick-question-list">
            {quickQuestions.map(({ title, message, icon: Icon }) => (
              <a
                key={title}
                className="quick-question"
                href={whatsappUrl(message)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="quick-question-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{title}</span>
                <FaArrowRight className="quick-question-arrow" aria-hidden="true" />
              </a>
            ))}
          </div>

          <a
            className="whatsapp-main-button"
            href={whatsappUrl("Hola, tengo una consulta sobre Altavera.")}
            target="_blank"
            rel="noreferrer"
          >
            <FaWhatsapp aria-hidden="true" />
            Escribir por WhatsApp
          </a>

          <p className="contact-actions-note">
            Se abrirá una conversación con Altavera en WhatsApp.
          </p>
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
          <p>Consulta en el mapa nuestras zonas de entrega actuales.</p>
        </div>

        <div className="map-section" aria-label="Mapa de cobertura de Altavera">
          <CoverageMap />
        </div>

        <div className="coverage-suggestion">
          <div>
            <h3>¿Todavía no llegamos hasta tu zona?</h3>
            <p>Contanos dónde te gustaría que Altavera amplíe sus entregas.</p>
          </div>
          <a
            className="coverage-suggestion-button"
            href={whatsappUrl(
              "Hola, me gustaría proponer una nueva zona de entrega para Altavera. La ubicación es:"
            )}
            target="_blank"
            rel="noreferrer"
          >
            <FaMapMarkerAlt aria-hidden="true" />
            Proponer una nueva zona
          </a>
        </div>
      </section>
    </main>
  );
}
