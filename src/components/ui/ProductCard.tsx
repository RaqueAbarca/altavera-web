"use client";

type ProductCardProps = {
  image: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
};

export default function ProductCard({
  image,
  name,
  price,
  unit,
  quantity,
  onAdd,
  onIncrease,
  onDecrease,
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

        {quantity === 0 ? (
          <button
            className="add-btn"
            onClick={onAdd}
          >
            Agregar
          </button>
        ) : (
          <div className="quantity-controls">
            <button
              className="qty-btn"
              onClick={onDecrease}
            >
              −
            </button>

            <span className="qty">
              {quantity}
            </span>

            <button
              className="qty-btn"
              onClick={onIncrease}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}