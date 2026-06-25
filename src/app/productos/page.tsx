import ProductsSection from "@/app/productos/ProductsSection";

export default function ProductosPage() {
  return (
    <main className="container">
      <div style={{ padding: "40px 0" }}>
        <h1>Todos nuestros productos</h1>
        <p>
          Frutas y verduras frescas seleccionadas para su hogar.
        </p>
      </div>

      <ProductsSection />
    </main>
  );
}