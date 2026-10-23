// Verified against https://heisskraft.ru/contacts/ on 2026-10-15.
// The map constructor and messenger destinations come from that page's HTML.
import type { Contacts } from "@/content/types";

export const contacts = {
  phone: "+7 (495) 258-45-42",
  phoneHref: "tel:+74952584542",
  email: "info@heisskraft.ru",
  serviceEmail: "service@heisskraft.ru",
  serviceExtensions: "132, 154",
  address: "141214, Россия, Московская область, г. Пушкино, пос. Зверосовхоза, ул. Соболиная, дом 11, стр. 1, оф. 1-19",
  region: "141214, Россия, Московская область",
  locality: "г. Пушкино, пос. Зверосовхоза",
  street: "ул. Соболиная, дом 11, стр. 1, оф. 1‑19",
  hours: "09:00–18:00",
  mapEmbed: "https://yandex.ru/map-widget/v1/?um=constructor%3A9613aeab0364b4d54bd324cc0549c84ae17b60290f9ec4be7efd1c1e770eb458&source=constructor",
  messengers: [
    { name: "WeChat", href: "https://u.wechat.com/kJXxQxISj4YYcvjmO27PJrk?s=4", icon: "/icons/messengers/wechat.svg" },
    { name: "MAX", href: "https://max.ru/id7728291164_bot", icon: "/icons/messengers/max.png" },
  ],
} satisfies Contacts;

const destination = "Московская область, Пушкино, посёлок Зверосовхоза, Соболиная улица, 11, строение 1";
export const contactMapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(destination)}`;
export const contactRouteUrl = `https://yandex.ru/maps/?rtext=~${encodeURIComponent(destination)}&rtt=auto`;
