"use client";

import ProductCard from "../ui/ProductCard";
import { useCart } from "@/hooks/useCart";

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

  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : products.filter(
          (p) => p.category === selectedCategory
        );

  return (
    <div className="products-grid">
      {filteredProducts.map((product) => {

        const cartItem = cart.find(
          (item) => item.id === product.id
        );

        const quantity = cartItem?.quantity ?? 0;

        return (
          <ProductCard
            key={product.id}
            image={product.image_url}
            name={product.name}
            price={product.price}
            unit={product.unit}
            quantity={quantity}
            onAdd={() =>
              addToCart({
                id: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                unit: product.unit,
                image: product.image_url,
              })
            }
            onIncrease={() =>
              increaseQuantity(product.id)
            }
            onDecrease={() =>
              decreaseQuantity(product.id)
            }
          />
        );
      })}
    </div>
  );
}