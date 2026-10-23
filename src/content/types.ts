/** Serializable content contracts. A future CMS adapter must return these shapes. */
export interface Article {
  query: string; wordstat: number; seed: string; slug: string; title: string;
  description: string; category: string; lead: string;
  sections: { heading: string; paragraphs: string[] }[];
  faq: { question: string; answer: string }[];
  sources: { title: string; url: string }[];
  related: string[]; status: string; language: string; date: string;
  catalogHref: string; selectionHref: string; wordstatSource: string; readingMinutes: number;
}
export type ArticleSummary = Pick<Article, "slug" | "title" | "description" | "category" | "readingMinutes">;
export interface Contacts {
  phone: string; phoneHref: string; email: string; serviceEmail: string;
  serviceExtensions: string; address: string; region: string; locality: string;
  street: string; hours: string; mapEmbed: string;
  messengers: { name: string; href: string; icon: string }[];
}
export interface ProductDescription<Id extends string = string> {
  id: Id; label: string; title: string; text: string;
  image: string; alt: string; detail?: string; badge?: string;
}
export interface FireStation {
  id: "fpa" | "fpv"; name: string; application: string; description: string;
}
