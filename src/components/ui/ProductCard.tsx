"use client";

type ProductCardProps = {
  image: string;
  name: string;
  price: number;
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

      <img
        src={image}
        alt={name}
        className="product-image"
      />

      <div className="product-content">

        <h3>{name}</h3>

        <p className="price">
          ₡{price.toLocaleString("es-CR")}
          <span> / {unit}</span>
        </p>

        <button
          className="add-btn"
          onClick={onAdd}
        >
          Agregar
        </button>

      </div>

    </div>
  );
}