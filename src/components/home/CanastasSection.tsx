import CanastaCard from "../ui/CanastaCard";

const canastas = [
  {
    image: "/canasta1.jpg",
    name: "Familiar",
    description: "Ideal para 4 personas",
    price: "₡18.900",
  },
  {
    image: "/canasta2.jpg",
    name: "Premium",
    description: "Selección gourmet",
    price: "₡29.900",
  },
  {
    image: "/canasta3.jpg",
    name: "Semanal",
    description: "Reposición semanal",
    price: "₡14.900",
  },
];

export default function CanastasSection() {
  return (
    <section className="container section">
      <div className="section-header">
        <h2>Nuestros canastas</h2>
        <a href="#">Ver todas las canastas →</a>
      </div>

      <div className="canastas-grid">
        {canastas.map((canasta) => (
          <CanastaCard key={canasta.name} {...canasta} />
        ))}
      </div>
    </section>
  );
}