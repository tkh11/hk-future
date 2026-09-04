import Hero from "@/sections/home/Hero";
import ProjectForm from "@/sections/home/ProjectForm";
import Preloader from "@/components/layout/Preloader";

export default function HomePage() {
  return (
    <>
      <Preloader />
      <main>
        <Hero />
        <ProjectForm />
      </main>
    </>
  );
}
