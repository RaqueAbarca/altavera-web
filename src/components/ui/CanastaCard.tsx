type CanastaCardProps = {
  image: string;
  name: string;
  description: string;
  price: string;
};

export default function CanastaCard({
  image,
  name,
  description,
  price,
}: CanastaCardProps) {
  return (
    <div className="canasta-card">
      <img src={image} alt={name} className="canasta-image" />

      <div className="canasta-content">
        <h3>{name}</h3>

        <p>{description}</p>

        <h4>{price}</h4>

        <button className="outline-btn">
          Ver canasta
        </button>
      </div>
    </div>
  );
}