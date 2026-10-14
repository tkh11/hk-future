"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import styles from "./Articles.module.css";

const normalize = (text: string) => text.toLocaleLowerCase("ru").replaceAll("ё", "е");
const searchStem = (word: string) => word.length > 4 ? word.replace(/(ами|ями|ого|ему|ому|ыми|ими|ый|ий|ой|ая|яя|ое|ее|ые|ие|ов|ев|ам|ям|ах|ях|ую|юю|ом|ем|а|я|ы|и|у|ю|е|о)$/u, "") : word;

export default function ArticleLibrary({ articles }: { articles: ArticleSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все темы");
  const categories = ["Все темы", ...new Set(articles.map((article) => article.category))];
  const words = normalize(query).trim().split(/\s+/).filter(Boolean).map(searchStem);
  const visible = articles.filter((article) => {
    const text = normalize(`${article.title} ${article.description}`);
    return (category === "Все темы" || article.category === category) && words.every((word) => text.includes(word));
  });

  return (
    <>
      <div className={styles.controls}>
        <label className={styles.search}>
          <span>Поиск по статьям</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, насос или тёплый пол" />
        </label>
        <div className={styles.filters} role="group" aria-label="Темы статей">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </div>
      <p className={styles.srOnly} role="status">{visible.length ? `Показано статей: ${visible.length}` : "Статьи не найдены"}</p>
      <div className={styles.list}>
        {visible.map((article) => (
          <article key={article.slug} className={styles.row}>
            <p className={styles.meta}>{article.category}<span>{article.readingMinutes} мин чтения</span></p>
            <div>
              <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
              <p>{article.description}</p>
            </div>
          </article>
        ))}
        {!visible.length && <div className={styles.empty}><h2>Статьи не найдены</h2><p>Попробуйте другое слово или выберите все темы.</p><button type="button" onClick={() => { setQuery(""); setCategory("Все темы"); }}>Сбросить поиск</button></div>}
      </div>
    </>
  );
}
