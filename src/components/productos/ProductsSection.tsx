"use client";

import ProductCard from "../ui/ProductCard";

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  image_url: string;
};

type Props = {
  products: Product[];
  selectedCategory: string;
};

export default function ProductsSection({
  products,
  selectedCategory,
}: Props) {
  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="products-grid">
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          image={product.image_url}
          name={product.name}
          price={`₡${product.price}`}
          unit={product.unit}
        />
      ))}
    </div>
  );
}