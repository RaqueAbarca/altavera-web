import Image from "next/image";

export default function AboutHero(){
  return(
    <section className="nosotros-intro nosotros-shell">
      <div className="nosotros-intro-copy">
        <span className="nosotros-eyebrow">Sobre nosotros</span>

        <h1>¿Qué es Altavera?</h1>

        <p className="nosotros-lead">
          Altavera es una marca costarricense que busca hacer más simple
          recibir frutas y verduras frescas en casa, con una selección
          cuidada, atención cercana y una experiencia de compra confiable.
        </p>

        <p>
          Estamos construyendo una forma más humana de comprar productos
          frescos: clara, práctica y pensada para facilitar el día a día de
          cada hogar.
        </p>
      </div>

      <div className="nosotros-intro-visual" aria-hidden="true">
        <div className="nosotros-shape nosotros-shape-green" />
        <div className="nosotros-shape nosotros-shape-orange" />

        <div className="nosotros-intro-image-card">
          <Image
            src="/heroBox.png"
            alt="Caja Altavera con frutas y verduras frescas"
            width={760}
            height={620}
            priority
            className="nosotros-intro-image"
          />
        </div>
      </div>
    </section>
  );
}
