import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle, articleUrl } from "@/lib/articles";
import styles from "@/sections/articles/Articles.module.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const canonical = articleUrl(`/articles/${article.slug}`);
  return {
    title: `${article.title} — HEISSKRAFT`,
    description: article.description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: { type: "article", title: article.title, description: article.description, locale: "ru_RU", ...(canonical ? { url: canonical } : {}) },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const related = article.related.map(getArticle).filter((item) => item !== undefined);
  const schema = {
    "@context": "https://schema.org", "@type": "Article",
    headline: article.title, description: article.description, inLanguage: "ru",
    ...(articleUrl(`/articles/${article.slug}`) ? { mainEntityOfPage: articleUrl(`/articles/${article.slug}`) } : {}),
  };
  return (
    <main className={`${styles.page} ${styles.detail}`}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/articles">Все статьи</Link><span aria-hidden="true">/</span><span>{article.category}</span></nav>
      <article>
        <header className={styles.articleHeader}><h1>{article.title}</h1><p className={styles.meta}>{article.readingMinutes} мин чтения</p><p className={styles.lead}>{article.lead}</p></header>
        <div className={styles.articleLayout}>
          <nav className={styles.contents} aria-label="Содержание статьи"><h2>В этой статье</h2><ol>{article.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`}>{section.heading}</a></li>)}<li><a href="#questions">Частые вопросы</a></li></ol></nav>
          <div className={styles.prose}>
            {article.sections.map((section, index) => <section id={`section-${index + 1}`} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
            <section id="questions"><h2>Частые вопросы</h2>{article.faq.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
            <section className={styles.product}><h2>Решения для вашего проекта</h2><p>Перейдите к подходящему разделу каталога HEISSKRAFT. Характеристики и совместимость конкретного изделия проверяйте по его технической документации.</p><div className={styles.actions}><Link href={article.catalogHref}>Каталог оборудования</Link><Link href={article.selectionHref}>{article.selectionHref.endsWith("pumps") ? "Подбор насосов" : "Подбор трубопровода"}</Link></div></section>
            <details className={styles.sources}><summary>Источники и документация</summary><ul>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></details>
          </div>
        </div>
      </article>
      <section className={styles.related}><h2>Читайте также</h2>{related.map((item) => <Link key={item.slug} href={`/articles/${item.slug}`}>{item.title}</Link>)}</section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </main>
  );
}
