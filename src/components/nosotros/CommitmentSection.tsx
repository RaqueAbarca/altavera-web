import {
  HeartHandshake,
  PackageCheck,
  ShoppingBasket,
  Sprout,
} from "lucide-react";

const commitments=[
  {
    icon:<ShoppingBasket size={28} strokeWidth={1.8} />,
    title:"Selección cuidada",
    text:"Buscamos que cada pedido salga con productos que nosotros mismos elegiríamos para nuestro hogar.",
  },
  {
    icon:<HeartHandshake size={28} strokeWidth={1.8} />,
    title:"Atención cercana",
    text:"Queremos que detrás de cada compra se sienta que hay personas reales dispuestas a ayudar.",
  },
  {
    icon:<PackageCheck size={28} strokeWidth={1.8} />,
    title:"Un proceso simple",
    text:"Trabajamos para que pedir, recibir y disfrutar productos frescos sea cada vez más fácil.",
  },
  {
    icon:<Sprout size={28} strokeWidth={1.8} />,
    title:"Mejora continua",
    text:"Estamos comenzando y preferimos crecer bien: escuchando, aprendiendo y mejorando con cada pedido.",
  },
];

export default function CommitmentSection(){
  return(
    <section className="nosotros-commitment-section">
      <div className="nosotros-shell">
        <div className="nosotros-section-heading">
          <span className="nosotros-eyebrow light">Nuestro compromiso</span>
          <h2>Lo que queremos construir desde el inicio</h2>
          <p>
            En lugar de hablar de grandes números, preferimos contar cómo
            queremos trabajar y qué puede esperar de nosotros cada persona que
            confíe en Altavera.
          </p>
        </div>

        <div className="nosotros-commitment-grid">
          {commitments.map((item)=>(
            <article className="nosotros-commitment-card" key={item.title}>
              <div className="nosotros-commitment-icon">
                {item.icon}
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
