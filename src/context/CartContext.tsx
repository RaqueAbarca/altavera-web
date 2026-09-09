"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { CartItem } from "@/types/cart";
import type { MaturityPreference } from "@/lib/maturity";
import { getCart, saveCart } from "@/lib/cartStorage";
import { isKilogramUnit } from "@/lib/productUnits";

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: number) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  setMaturityPreference: (
    id: number,
    preference: MaturityPreference | null
  ) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;
  mergeCart: (items: CartItem[]) => void;
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
    return isKilogramUnit(unit) ? 0.5 : 1;
  }

  function addToCart(product: CartItem) {
    setCart((current) => {
      const exists = current.find(
        (item) => item.id === product.id
      );

      if (exists) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...product,
                maturity_preference:
                  Object.prototype.hasOwnProperty.call(
                    product,
                    "maturity_preference"
                  )
                    ? product.maturity_preference ?? null
                    : item.maturity_preference ?? null,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          maturity_preference:
            product.maturity_preference ?? null,
        },
      ];
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

  function setMaturityPreference(
    id: number,
    preference: MaturityPreference | null
  ) {
    setCart((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              maturity_preference: preference,
            }
          : item
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  function replaceCart(items: CartItem[]) {
    setCart(
      items.map((item) => ({
        ...item,
        maturity_preference: item.maturity_preference ?? null,
      }))
    );
  }

  function mergeCart(items: CartItem[]) {
    setCart((current) => {
      const merged = [...current];

      items.forEach((incoming) => {
        const index = merged.findIndex(
          (item) => item.id === incoming.id
        );

        if (index === -1) {
          merged.push({
            ...incoming,
            maturity_preference:
              incoming.maturity_preference ?? null,
          });
          return;
        }

        const existing = merged[index];

        merged[index] = {
          ...existing,
          ...incoming,
          quantity: existing.quantity + incoming.quantity,
          maturity_preference:
            existing.maturity_preference ??
            incoming.maturity_preference ??
            null,
        };
      });

      return merged;
    });
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
        setMaturityPreference,
        clearCart,
        replaceCart,
        mergeCart,
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
