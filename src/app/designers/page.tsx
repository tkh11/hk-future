import type { Metadata } from "next";
import PipelineViewer from "@/sections/designers/PipelineViewer";

export const metadata: Metadata = {
  title: "Проектировщикам — HEISSKRAFT",
  description:
    "Интерактивная 3D-модель здания с трубопроводом HEISSKRAFT: выберите элемент и откройте его описание.",
};

export default function DesignersPage() {
  return (
    <main>
      <PipelineViewer />
    </main>
  );
}
