import {
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

export default function ContactPage() {
  return (
    <main className="contact-page container">

      <section className="contact-hero">

        {/* Lado izquierdo */}

        <div className="contact-info">

          <h1>Contáctanos</h1>

          <p className="subtitle">
            Estamos aquí para ayudarte.
          </p>

          <span className="breadcrumb">
            Inicio {" > "} Contacto
          </span>

          <div className="info-list">

            <div className="info-item">
              <FaWhatsapp />
              <div>
                <strong>Escríbenos por WhatsApp</strong>
                <p>7000 1234</p>
              </div>
            </div>

            <div className="info-item">
              <FaPhoneAlt />
              <div>
                <strong>Llámanos</strong>
                <p>7000 1234</p>
              </div>
            </div>

            <div className="info-item">
              <FaEnvelope />
              <div>
                <strong>Email</strong>
                <p>hola@altavera.cr</p>
              </div>
            </div>

            <div className="info-item">
              <FaMapMarkerAlt />
              <div>
                <strong>Zona de cobertura</strong>
                <p>
                  Escazú, Santa Ana,
                  <br />
                  Curridabat, Tres Ríos
                  <br />
                  y alrededores.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Centro */}

        <div className="contact-form-card">

          <input
            type="text"
            placeholder="Nombre completo"
          />

          <input
            type="email"
            placeholder="Email"
          />

          <input
            type="text"
            placeholder="Teléfono"
          />

          <textarea
            placeholder="Mensaje"
            rows={5}
          />

          <button>
            Enviar mensaje
          </button>

        </div>

        {/* Imagen */}

        <div className="contact-image">

          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=700"
            alt="Canasta"
          />

          <div className="orange-blob"></div>

        </div>

      </section>

      {/* MAPA */}

      <section className="map-section">

        <iframe
          title="Mapa"
          src="https://www.google.com/maps?q=Escaz%C3%BA,+Costa+Rica&output=embed"
          loading="lazy"
        />

      </section>

    </main>
  );
}