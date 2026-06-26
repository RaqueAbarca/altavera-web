"use client";

type Product = {
  category: string;
};

type Props = {
  products: Product[];
  selected: string;
  onSelect: (category: string) => void;
};

export default function ProductFilters({
  products,
  selected,
  onSelect,
}: Props) {
  const categories = [
    "Todos",
    ...Array.from(
      new Set(products.map((p) => p.category))
    ),
  ];

  return (
    <div>
      <h3>Categorías</h3>

      <div className="filters-list">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={
              selected === category ? "filter active" : "filter"
            }
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}