import type { Metadata } from "next";
import CatalogScreen from "@/sections/catalog/CatalogScreen";

export const metadata: Metadata = {
  title: "Каталог — HEISSKRAFT",
  description:
    "Каталог HEISSKRAFT: трубопроводные системы Therm, Multilayer, HDPE, FireOff, Black Pipe, насосное и вспомогательное оборудование.",
};

export default function CatalogPage() {
  return <CatalogScreen />;
}
