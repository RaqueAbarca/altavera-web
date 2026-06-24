export default function Features() {
  return (
    <section className="container-features" style={{ marginTop: 40 }}>
      <div className="features-box">

        <div className="feature-item">
        <div className="feature-icon">
          <img src="/fresco.svg" alt="Fresco" />
        </div>
          <div className="feature-title">Fresco</div>
          <div className="feature-desc">Productos seleccionados con cuidado</div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <img src="/premium.svg" alt="Premium" />
        </div>
          <div className="feature-title">Premium</div>
          <div className="feature-desc">Calidad superior en cada producto</div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <img src="/domicilio.svg" alt="A domicilio" />
            </div>
          <div className="feature-title">A domicilio</div>
          <div className="feature-desc">Entregado directo a su puerta</div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
        <img src="/confiable.svg" alt="Confiable" />
        </div>
          <div className="feature-title">Confiable</div>
          <div className="feature-desc">Transparencia y cercanía</div>
        </div>

      </div>
    </section>
  );
}