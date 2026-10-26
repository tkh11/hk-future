import type { Block, Field } from "payload";
import { safeContentHref, siteSectionKeys } from "./types";
export type { CmsPageBlock, CmsMedia, MediaReference, CmsAction } from "./types";
export { parsePublicBlocks } from "./parse";

const hidden: Field = { name: "hidden", type: "checkbox", label: "Скрыть блок", defaultValue: false };
const heading = (required = true): Field => ({ name: "heading", type: "text", label: "Заголовок", required, maxLength: 160 });
const text: Field = { name: "text", type: "textarea", label: "Текст", required: true, maxLength: 12000, admin: { description: "Обычный текст. Пустая строка отделяет абзацы; HTML и скрипты не исполняются." } };
const image: Field = { name: "image", type: "upload", relationTo: "media", label: "Изображение", filterOptions: { mimeType: { contains: "image/" } } };
const href = (required = true): Field => ({ name: "href", type: "text", label: "Ссылка", required, maxLength: 2048, validate: (value: unknown) => !value && !required || Boolean(safeContentHref(value)) || "Укажите внутренний путь /catalog или адрес https://…" });
const actions = (required = false): Field => ({ name: "actions", type: "array", label: "Кнопки", maxRows: 2, minRows: required ? 1 : 0, required, fields: [{ name: "label", label: "Название", type: "text", required: true, maxLength: 80 }, href()] });
const wrap = (slug: string, singular: string, fields: Field[]): Block => ({ slug, labels: { singular, plural: singular }, fields: [hidden, ...fields] });

const sectionLabels = ['Главный баннер', 'О компании', 'Инженерные решения', 'ЦОД: заглавный баннер', 'ЦОД: информация', 'ЦОД: модель', 'ЦОД: решения', 'Пожаротушение: заглавный баннер', 'Пожаротушение: информация', 'Пожаротушение: модель', 'Пожаротушение: решения'];
export const pageBlocks: Block[] = [
  wrap("siteSection", "Готовый раздел сайта", [{ name: "section", label: "Раздел", type: "select", required: true, options: siteSectionKeys.map((value, index) => ({ value, label: sectionLabels[index] })), admin: { description: "Сохраняет существующий дизайн, видео и модели. Можно менять порядок, скрывать или заменять обычными блоками." } }]),
  wrap("hero", "Заглавный баннер", [heading(), { name: "description", type: "textarea", label: "Краткий текст", maxLength: 600 }, image, actions()]),
  wrap("text", "Текстовый блок", [heading(false), text]),
  wrap("categories", "Карточки разделов", [heading(false), { name: "items", type: "array", label: "Разделы", required: true, minRows: 1, maxRows: 12, fields: [{ name: "title", type: "text", label: "Название", required: true, maxLength: 120 }, href(), image] }]),
  wrap("imageText", "Изображение и текст", [heading(), text, image, { name: "imageSide", type: "select", label: "Расположение изображения", defaultValue: "left", options: [{ label: "Слева", value: "left" }, { label: "Справа", value: "right" }] }, actions()]),
  wrap("promoBanner", "Рекламный баннер", [image, href(false), { name: "sheen", label: "Перелив", type: "select", defaultValue: "neutral", options: [{ label: "Нейтральный", value: "neutral" }, { label: "Зелёный — ClimatFaser", value: "green" }, { label: "Красный — FireOff", value: "red" }] }]),
  wrap("modelDescriptions", "Описания элементов модели", [heading(false), { name: "model", type: "select", label: "Система", required: true, options: [{ label: "ЦОД", value: "data-centers" }, { label: "Пожаротушение", value: "fire-suppression" }] }, {
    name: "items", type: "array", label: "Элементы", required: true, minRows: 1, maxRows: 8, fields: [
      { name: "element", type: "select", label: "Элемент системы", required: true, admin: { description: "Привязка к существующему элементу; положение, камера и геометрия модели не редактируются." }, options: [
        { label: "ЦОД · ClimatFaser", value: "pipes" }, { label: "ЦОД · Насосы HIP", value: "pumps" }, { label: "ЦОД · Арматура", value: "valves" },
        { label: "Пожаротушение · Станция", value: "station" }, { label: "Пожаротушение · FireOff", value: "pipework" }, { label: "Пожаротушение · Спринклер", value: "sprinkler" }, { label: "Пожаротушение · Пожарные краны", value: "hydrants" }, { label: "Пожаротушение · Фланец", value: "flange" },
      ] },
      { name: "title", type: "text", label: "Заголовок", required: true, maxLength: 160 }, text, image, href(false),
    ],
  }]),
  wrap("cta", "Призыв к действию", [heading(), { ...text, required: false }, actions(true)]),
];
