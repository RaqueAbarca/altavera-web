"use client";

export const SEASONAL_CATEGORY = "Productos de temporada";

type Product = {
  category: string;
  is_seasonal?: boolean;
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
  const regularCategories = Array.from(
    new Set(products.map((product) => product.category))
  );

  const hasSeasonalProducts = products.some(
    (product) => product.is_seasonal
  );

  const categories = [
    "Todos",
    ...(hasSeasonalProducts ? [SEASONAL_CATEGORY] : []),
    ...regularCategories,
  ];

  return (
    <div>
      <h3>Categorías</h3>

      <div className="filters-list">
        {categories.map((category) => {
          const isSeasonal = category === SEASONAL_CATEGORY;

          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={[
                "filter",
                selected === category ? "active" : "",
                isSeasonal ? "seasonal-filter" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
