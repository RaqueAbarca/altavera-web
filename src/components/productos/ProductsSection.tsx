"use client";

import "./productos.css";
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
  search: string;
};

export default function ProductsSection({
  products,
  selectedCategory,
  search,
}: Props) {

  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart
  } = useCart();

  const filteredProducts = products.filter((product) => {

    const matchesCategory =
      selectedCategory === "Todos" ||
      product.category === selectedCategory;

    const matchesSearch =
      product.name
        .toLowerCase()
        .includes(search.toLowerCase().trim());

    return matchesCategory && matchesSearch;

  });

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
            onAdd={(quantity) =>
              addToCart({
                id: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                unit: product.unit,
                image: product.image_url,
                quantity,
              })
            }
            onIncrease={() =>
              increaseQuantity(product.id)
            }
            onDecrease={() =>
              decreaseQuantity(product.id)
            }
            onRemove={() =>
              removeFromCart(product.id)
            }
          />
        );
      })}
    </div>
  );
}