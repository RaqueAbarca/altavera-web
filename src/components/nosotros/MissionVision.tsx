import {
  Leaf,
  Star,
  ShieldCheck,
} from "lucide-react";

const items=[
  {
    icon:<Leaf size={30} strokeWidth={1.8} />,
    title:"Nuestra misión",
    text:"Facilitar el acceso a frutas y verduras frescas mediante una experiencia de compra práctica, cuidada y cercana.",
  },
  {
    icon:<Star size={30} strokeWidth={1.8} />,
    title:"Nuestra visión",
    text:"Construir una opción de confianza para los hogares que buscan frescura, comodidad y un servicio cada vez mejor.",
  },
  {
    icon:<ShieldCheck size={30} strokeWidth={1.8} />,
    title:"Nuestros valores",
    text:"Frescura, cercanía, transparencia, responsabilidad y mejora continua en cada etapa del proyecto.",
  },
];

export default function MissionVision(){
  return(
    <section className="nosotros-values nosotros-shell">
      {items.map((item)=>(
        <article className="nosotros-value-card" key={item.title}>
          <div className="nosotros-value-icon">
            {item.icon}
          </div>

          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
}
