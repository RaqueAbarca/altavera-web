import "@/components/home/home.css";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import LoginPromo from "@/components/home/LoginPromo";

export default function Home() {
  return (
    <>
      <LoginPromo />
      <Hero />
      <Features />
      <FeaturedProducts />
    </>
  );
}
