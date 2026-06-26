import {
  CheckCircle,
  Star,
  Users,
  Truck,
} from "lucide-react";

export default function StatsBar() {

  const stats = [
    {
      icon: <CheckCircle size={28} />,
      number: "+500",
      label: "Entregas realizadas",
    },
    {
      icon: <Star size={28} />,
      number: "+95%",
      label: "Clientes satisfechos",
    },
    {
      icon: <Users size={28} />,
      number: "+20",
      label: "Productores locales",
    },
    {
      icon: <Truck size={28} />,
      number: "24h",
      label: "Entrega garantizada",
    },
  ];

  return (
    <section className="stats-bar">

      {stats.map((stat) => (

        <div className="stat-item" key={stat.label}>

          {stat.icon}

          <h2>{stat.number}</h2>

          <p>{stat.label}</p>

        </div>

      ))}

    </section>
  );
}