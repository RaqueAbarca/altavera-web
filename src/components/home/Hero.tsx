export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">

        {/* TEXTO */}
        <div className="hero-text">
          <h1>Selección fresca para su hogar.</h1>

          <p>
            Frutas y verduras de calidad entregadas directamente a su puerta.
          </p>

          <div className="hero-buttons">
            <button className="btn btn-primary">Comprar ahora</button>
            <button className="btn btn-secondary">Ver catálogo</button>
          </div>
        </div>

        {/* IMAGEN */}
        <div className="hero-image">
          <img src="/heroBox.png" alt="Altavera productos" />
        </div>

      </div>
    </section>
  );
}