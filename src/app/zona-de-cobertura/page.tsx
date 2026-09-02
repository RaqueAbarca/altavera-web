import Link from "next/link";
import CoverageMap from "@/components/coverage/CoverageMap";
import "./zonaCobertura.css";

const areas = [
  {
    province: "Alajuela",
    places: "Cantón de Alajuela, excepto Sarapiquí",
  },
  {
    province: "Heredia",
    places:
      "Heredia centro, Belén, Santa Bárbara, San Isidro, San Pablo, Barva y San Rafael",
  },
  {
    province: "San José",
    places:
      "Tibás, Moravia, Escazú, Santa Ana, Pavas y alrededores de La Sabana",
  },
];

export default function ZonaDeCoberturaPage() {
  return (
    <main className="coverage-page">
      <section className="coverage-hero container">
        <span className="coverage-eyebrow">
          Entregas Altavera
        </span>
        <h1>Zona de cobertura</h1>
        <p>
          Actualmente realizamos entregas en sectores de
          Alajuela, Heredia y San José. Consulta el mapa para
          conocer nuestra cobertura actual.
        </p>
      </section>

      <section className="coverage-main container">
        <div className="coverage-map-card">
          <CoverageMap />
          <p className="coverage-map-note">
            El área sombreada representa nuestra cobertura
            general. La disponibilidad final se confirma al
            seleccionar la ubicación exacta durante el checkout.
          </p>
        </div>

        <aside className="coverage-list-card">
          <h2>¿Dónde entregamos?</h2>

          <div className="coverage-area-list">
            {areas.map((area) => (
              <article
                key={area.province}
                className="coverage-area-item"
              >
                <strong>{area.province}</strong>
                <p>{area.places}</p>
              </article>
            ))}
          </div>

          <div className="coverage-notice">
            <strong>¿No estás seguro de tu ubicación?</strong>
            <p>
              En el checkout puedes colocar el pin de tu
              dirección y el sistema verificará automáticamente
              si podemos realizar la entrega.
            </p>
          </div>

          <Link
            href="/productos"
            className="coverage-shop-link"
          >
            Ver productos
          </Link>
        </aside>
      </section>
    </main>
  );
}
