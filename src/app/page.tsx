import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ProductsSection from "@/components/productos/ProductsSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import WhySection from "@/components/home/WhySection";
import CTAWhatsApp from "@/components/home/CTAWhatsApp";
import LoginPromo from "@/components/home/LoginPromo";

export default function Home() {
  return (
    <>
      <LoginPromo/>
      <Hero />
      <Features />
      <FeaturedProducts />
      {/*<ProductsSection />*/}
      {/*<WhySection />*/}
      {/*<CTAWhatsApp />*/}
    </>
  );
}