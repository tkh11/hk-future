import Hero from "@/sections/home/Hero";
import Preloader from "@/components/layout/Preloader";

export default function HomePage() {
  return (
    <>
      <Preloader />
      <main>
        <Hero />
      </main>
    </>
  );
}
