import Link from "next/link";
import ProductCard from "../ui/ProductCard";
import { products } from "@/data/products";

export default function FeaturedProducts() {
  const featuredProducts = products.slice(0, 6);

  return (
    <section className="container section">
      <div className="section-header">
        <h2>Nuestros productos</h2>

        <Link href="/productos">
          Ver todos los productos →
        </Link>
      </div>

      <div className="featured-products">
        {featuredProducts.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
          />
        ))}
      </div>
    </section>
  );
}