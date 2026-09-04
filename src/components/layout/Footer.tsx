import Link from "next/link";
import "./footer.css";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

const INSTAGRAM_URL = "https://www.instagram.com/altavera.cr/?hl=es-la";
const WHATSAPP_URL = "https://wa.me/50686526792";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <img src="/logowhite.svg" alt="Altavera" className="footer-logo" />

          <p>
            Comprometidos con llevar a tu hogar productos frescos, premium y de origen
            con el mejor servicio.
          </p>

          <div className="socials">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Altavera"
              title="Instagram"
            >
              <FaInstagram size={24} />
            </a>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp de Altavera"
              title="WhatsApp"
            >
              <FaWhatsapp size={24} />
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h4>Enlaces</h4>
          <Link href="/">Inicio</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/zona-de-cobertura">Zona de cobertura</Link>
        </div>

        <div className="footer-column">
          <h4>Ayuda</h4>
          <Link href="/ayuda">Centro de ayuda</Link>
          <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link>
          <Link href="/envios">Política de envíos</Link>
          <Link href="/cambios-y-devoluciones">Cambios y devoluciones</Link>
        </div>

        <div className="footer-column">
          <h4>Legal</h4>
          <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
          <Link href="/privacidad">Política de privacidad</Link>
        </div>

      </div>

      <div className="footer-bottom">
        © 2026 Altavera. Todos los derechos reservados.
      </div>

      <div className="footer-plant"></div>
      <div className="footer-orange"></div>
    </footer>
  );
}
