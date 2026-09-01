import {
  BriefcaseBusiness,
  HeartHandshake,
} from "lucide-react";

export default function TeamSection(){
  return(
    <section className="nosotros-team-section">
      <div className="nosotros-shell">
        <div className="nosotros-team-heading">
          <span className="nosotros-eyebrow">Equipo y apoyo</span>
          <h2>Altavera también se construye con las personas que nos acompañan</h2>
          <p>
            Conforme el proyecto crezca, queremos presentar aquí a quienes se
            sumen al equipo y a las personas que aportan su experiencia para
            ayudarnos a tomar mejores decisiones.
          </p>
        </div>

        <div className="nosotros-team-grid">
          <article className="nosotros-team-card founders">
            <div className="nosotros-team-icon">
              <HeartHandshake size={27} strokeWidth={1.8} />
            </div>
            <div>
              <span className="nosotros-team-role">Fundadores</span>
              <h3>El equipo detrás del día a día</h3>
              <p>
                Desde la operación y la experiencia de compra hasta las ideas
                que siguen dando forma a Altavera.
              </p>
            </div>
          </article>

          <article className="nosotros-team-card advisor">
            <div className="nosotros-team-icon">
              <BriefcaseBusiness size={27} strokeWidth={1.8} />
            </div>
            <div>
              <span className="nosotros-team-role">Asesoría financiera</span>
              <h3>Nombre del asesor</h3>
              <p className="nosotros-team-company">Nombre de la empresa</p>
              <p>
                Acompañamiento en planificación financiera, estructura de
                costos y decisiones para un crecimiento sostenible de Altavera.
              </p>
              <span className="nosotros-team-example">Ejemplo de perfil</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
