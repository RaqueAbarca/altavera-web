"use client";

import Image from "next/image";

export default function FoundersSection(){
  return(
    <section className="nosotros-founders-section nosotros-founders-hero">
      <div className="nosotros-shell nosotros-founders-grid">
        <div className="nosotros-founders-photo-wrap">
          <div className="nosotros-founders-photo-card">
            <Image
              src="/nosotros/equipo-altavera.webp"
              alt="Fundadores de Altavera"
              width={760}
              height={900}
              priority
              fetchPriority="high"
              className="nosotros-founders-photo"
              onError={(event)=>{
                event.currentTarget.src="/heroBox.png";
                event.currentTarget.classList.add("is-fallback");
              }}
            />
          </div>

          <span className="nosotros-founders-caption">
            Una idea que estamos construyendo juntos.
          </span>
        </div>

        <div className="nosotros-founders-copy">
          <span className="nosotros-eyebrow">Las personas detrás de Altavera</span>

          <h1>¿Quiénes somos?</h1>

          <p className="nosotros-founders-highlight">
            Somos una pareja de jóvenes universitarios con ganas de emprender,
            aprender y construir algo propio.
          </p>

          <p>
            Altavera nació de una idea sencilla: acercar productos frescos a
            los hogares de una forma práctica, confiable y cercana. Decidimos
            convertir esa idea en un proyecto real y hacerlo crecer paso a
            paso, involucrándonos directamente en cada parte del proceso.
          </p>

          <p>
            Estamos empezando, aprendiendo y mejorando sobre la marcha. Nuestro
            objetivo es que, mientras Altavera crece, nunca pierda la atención
            personal y el cuidado con los que nació.
          </p>
        </div>
      </div>
    </section>
  );
}
