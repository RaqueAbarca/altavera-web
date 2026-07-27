"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { Product } from "@/types/product";
import { CartItem } from "@/types/cart";
import { getCart, saveCart } from "@/lib/cartStorage";

type CartContextType = {
  cart: CartItem[];

  addToCart: (product: CartItem) => void;

  removeFromCart: (id: number) => void;

  increaseQuantity: (id: number) => void;

  decreaseQuantity: (id: number) => void;

  clearCart: () => void;

  totalItems: number;

  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  function getStep(unit: string) {
    return unit.trim().toLowerCase() === "kg" ? 0.5 : 1;
  }

  function addToCart(product: CartItem) {
    setCart((current) => {
      const exists = current.find(
        (p) => p.id === product.id
      );

      if (exists) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: product.quantity,
              }
            : item
        );
      }

      return [...current, product];
    });
  }

  function removeFromCart(id: number) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function increaseQuantity(id: number) {
    setCart((current) =>
      current.map((item) => {
        const step = getStep(item.unit);

        return item.id === id
          ? {
              ...item,
              quantity: item.quantity + step,
            }
          : item;
      })
    );
  }

  function decreaseQuantity(id: number) {
    setCart((current) =>
      current
        .map((item) => {
          const step = getStep(item.unit);

          return item.id === id
            ? {
                ...item,
                quantity: item.quantity - step,
              }
            : item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function clearCart() {
    setCart([]);
  }

  const totalItems = cart.length;

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCartContext debe usarse dentro de CartProvider"
    );
  }

  return context;
}