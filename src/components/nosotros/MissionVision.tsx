import { Leaf, Star, ShieldCheck } from "lucide-react";

export default function MissionVision() {

  const items = [
    {
      icon: <Leaf size={34} />,
      title: "Nuestra misión",
      text:
        "Brindar productos frescos, premium y confiables mejorando la calidad de vida de nuestros clientes.",
    },
    {
      icon: <Star size={34} />,
      title: "Nuestra visión",
      text:
        "Ser la opción #1 en delivery de frutas y verduras frescas en Costa Rica.",
    },
    {
      icon: <ShieldCheck size={34} />,
      title: "Nuestros valores",
      text:
        "Frescura, calidad, confianza, responsabilidad y pasión por lo que hacemos.",
    },
  ];

  return (
    <section className="mission-section">

      {items.map((item) => (

        <div className="mission-card" key={item.title}>

          <div className="mission-icon">
            {item.icon}
          </div>

          <h3>{item.title}</h3>

          <p>{item.text}</p>

        </div>

      ))}

    </section>
  );
}