import ProductCard from "../../components/ui/ProductCard";
import { products } from "@/data/products";


export default function ProductsSection() {
  return (
    <section className="container section">
      <div className="section-header">
        <h2>Nuestros productos</h2>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.name} {...product} />
        ))}
      </div>
    </section>
  );
}