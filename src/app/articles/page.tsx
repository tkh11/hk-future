import type { Metadata } from "next";
import ArticleLibrary from "@/sections/articles/ArticleLibrary";
import { articles, articleUrl } from "@/lib/articles";
import styles from "@/sections/articles/Articles.module.css";

const canonical = articleUrl("/articles");
export const metadata: Metadata = {
  title: "Статьи о трубах, насосах и отоплении — HEISSKRAFT",
  description: "Практические статьи о выборе труб, насосов, арматуры и оборудования для водоснабжения и отопления. База знаний HEISSKRAFT.",
  ...(canonical ? { alternates: { canonical } } : {}),
};

export default function ArticlesPage() {
  const summaries = articles.map(({ slug, title, description, category, readingMinutes }) => ({ slug, title, description, category, readingMinutes }));
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <h1>Статьи</h1>
        <p>Как выбрать трубы, насосы и оборудование для водоснабжения и отопления. Разбираем устройство систем и решения для вашего проекта.</p>
      </header>
      <ArticleLibrary articles={summaries} />
    </main>
  );
}
