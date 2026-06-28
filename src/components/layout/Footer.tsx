import {
  MessageCircle,
  MapPin
} from "lucide-react";

import { FaFacebook } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="footer">

      <div className="container footer-content">

        <div className="footer-brand">

          <img
            src="/logo.svg"
            alt="Altavera"
            className="footer-logo"
          />

          <p>
            Comprometidos con llevar a tu hogar
            productos frescos, premium y de origen
            con el mejor servicio.
          </p>

        <div className="socials">

          <FaInstagram size={24} />

          <FaFacebook size={24} />

          <MessageCircle size={24} />

        </div>

        </div>

        <div className="footer-column">
          <h4>Enlaces</h4>

          <a href="#">Inicio</a>
          <a href="#">Productos</a>
          <a href="#">Canastas</a>
          <a href="#">Nosotros</a>
          <a href="#">Contacto</a>
          <a href="#">Política de privacidad</a>
        </div>

        <div className="footer-column">
          <h4>Ayuda</h4>

          <a href="#">Preguntas frecuentes</a>
          <a href="#">Términos y condiciones</a>
          <a href="#">Política de envíos</a>
          <a href="#">Cambios y devoluciones</a>
        </div>

        <div className="footer-column">
          <h4>Zonas de cobertura</h4>

          <a href="#">📍 Alajuela Centro</a>
          <a href="#">📍 Desamparados</a>
          <a href="#">📍 Heredia</a>
          <a href="#">📍 Belén</a>
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