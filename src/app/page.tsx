import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ProductsSection from "@/app/productos/ProductsSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CanastasSection from "@/components/home/CanastasSection";
import WhySection from "@/components/home/WhySection";
import CTAWhatsApp from "@/components/home/CTAWhatsApp";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <FeaturedProducts />
      {/*<ProductsSection />*/}
      {/*<CanastasSection />*/}
      {/*<WhySection />*/}
      {/*<CTAWhatsApp />*/}
    </>
  );
}