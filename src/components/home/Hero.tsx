import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">

        {/* TEXTO */}
        <div className="hero-text">

          <h1>
            Selección fresca
            <span className="mobile-break"><br /></span>
            para su hogar.
          </h1>

          <p>
            Frutas y verduras premium
            <span className="mobile-break"><br /></span>
            entregadas directamente
            <span className="mobile-break"><br /></span>
            a su puerta.
          </p>

          <div className="hero-buttons">

            <Link href="/productos" className="btn btn-primary">
              Comprar ahora
            </Link>

            <button className="btn btn-secondary">
              Ver catálogo
            </button>

          </div>

        </div>


        {/* IMAGEN */}
        <div className="hero-image">

          <img 
            src="/heroBox.png" 
            alt="Altavera productos" 
          />

        </div>

      </div>
    </section>
  );
}