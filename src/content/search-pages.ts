import type { SiteSearchEntry } from "@/lib/site-search";

/** Existing public routes that are not catalog entries or articles. */
export const searchPages: SiteSearchEntry[] = [
  { href: "/docs", title: "Каталоги и документация", description: "Каталоги продукции, инструкции и PDF-документы HEISSKRAFT: просмотр и скачивание.", kind: "Страница" },
  { href: "/catalog", title: "Каталог", description: "Трубопроводные системы, насосное и вспомогательное оборудование.", kind: "Страница" },
  { href: "/solutions/data-centers", title: "Системы охлаждения ЦОД", description: "Трубопроводы ClimatFaser и насосное оборудование для центров обработки данных.", kind: "Страница", image: "/images/data-centers/pipes.jpg" },
  { href: "/solutions/fire-suppression", title: "Системы пожаротушения", description: "Трубопроводные системы FireOff и станции HK-Boost FPA/FPV.", kind: "Страница", image: "/images/fire-suppression/station-fpa.png" },
  { href: "/articles", title: "База знаний", description: "Статьи об инженерных системах и оборудовании.", kind: "Страница" },
  { href: "/designers", title: "Проектировщикам", description: "Материалы и инструменты для проектирования инженерных систем.", kind: "Страница" },
  { href: "/contacts", title: "Контакты", description: "Телефоны, электронная почта, адрес и время работы HEISSKRAFT.", kind: "Страница" },
  { href: "/projects", title: "Проекты", description: "Проекты HEISSKRAFT.", kind: "Страница" },
  { href: "/warranty", title: "Гарантия", description: "Гарантия на продукцию HEISSKRAFT.", kind: "Страница" },
  { href: "/selection/pipelines", title: "Подбор трубопровода", description: "Подбор трубопроводной системы.", kind: "Страница" },
];
