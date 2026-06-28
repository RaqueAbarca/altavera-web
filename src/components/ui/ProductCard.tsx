type ProductCardProps = {
  image: string;
  name: string;
  price: string;
  unit: string;
  onAdd: () => void;
};

export default function ProductCard({
  image,
  name,
  price,
  unit,
  onAdd,
}: ProductCardProps) {
  return (
    <div className="product-card">
      <img src={image} alt={name} className="product-image" />

      <div className="product-content">
        <h3>{name}</h3>

        <p className="price">
          {price} <span>/ {unit}</span>
        </p>

        <button
          className="add-btn"
          onClick={onAdd}
        >
          Agregar
          <span>🛒</span>
        </button>
      </div>
    </div>
  );
}