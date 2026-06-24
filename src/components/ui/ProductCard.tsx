type ProductCardProps = {
  image: string;
  name: string;
  price: string;
  unit: string;
};

export default function ProductCard({
  image,
  name,
  price,
  unit,
}: ProductCardProps) {
  return (
    <div className="product-card">
      <img src={image} alt={name} className="product-image" />

      <div className="product-content">
        <h3>{name}</h3>

        <p className="price">
          {price} <span>/ {unit}</span>
        </p>

        <button className="add-btn">
          Agregar
          <span>🛒</span>
        </button>
      </div>
    </div>
  );
}