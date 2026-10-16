import type { Metadata } from "next";
import Image from "next/image";
import { contacts, contactRouteUrl } from "@/lib/contacts";
import { publicPath } from "@/lib/public-path";
import ContactsMap from "@/sections/contacts/ContactsMap";
import styles from "@/sections/contacts/Contacts.module.css";

export const metadata: Metadata = {
  title: "Контакты — HEISSKRAFT",
  description: "Контакты офиса и сервисного центра HEISSKRAFT: +7 (495) 258-45-42, info@heisskraft.ru. Адрес, график работы и схема проезда в Пушкино.",
};

function ContactIcon({ type }: { type: "phone" | "service" | "pin" | "message" }) {
  return <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "phone" && <path d="m8 3 2 5-2.5 2a14 14 0 0 0 6.5 6.5l2-2.5 5 2v3a2 2 0 0 1-2 2C10.2 21 3 13.8 3 5a2 2 0 0 1 2-2h3Z" />}
    {type === "service" && <><path d="M4 13v-2a8 8 0 0 1 16 0v6a4 4 0 0 1-4 4h-2" /><rect x="2" y="11" width="4" height="7" rx="2" /><rect x="18" y="11" width="4" height="7" rx="2" /><path d="M11 21h3" /></>}
    {type === "pin" && <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
    {type === "message" && <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />}
  </svg>;
}

export default function ContactsPage() {
  return <main className={styles.page} data-header-theme="light">
    <header className={styles.intro}>
      <h1>Контакты</h1>
      <p>Свяжитесь с нами по вопросам продукции, сотрудничества и сервисного обслуживания.</p>
    </header>

    <div className={styles.channels}>
      <section className={styles.channel} aria-labelledby="office-title">
        <h2 id="office-title"><ContactIcon type="phone" />Офис</h2>
        <a className={styles.phone} href={contacts.phoneHref}>{contacts.phone}</a>
        <a className={styles.email} href={`mailto:${contacts.email}`}>{contacts.email}</a>
      </section>
      <section id="service" className={styles.channel} aria-labelledby="service-title">
        <h2 id="service-title"><ContactIcon type="service" />Сервисный центр</h2>
        <a className={styles.phone} href={contacts.phoneHref}>{contacts.phone}</a>
        <p className={styles.extensions}>Добавочные номера: {contacts.serviceExtensions}</p>
        <a className={styles.email} href={`mailto:${contacts.serviceEmail}`}>{contacts.serviceEmail}</a>
      </section>
    </div>

    <section className={styles.messengers} aria-labelledby="messengers-title">
      <div>
        <h2 id="messengers-title"><ContactIcon type="message" />Напишите нам</h2>
        <p>Выберите удобный мессенджер.</p>
      </div>
      <div className={styles.messengerLinks}>
        {contacts.messengers.map(item => <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className={styles.messengerLink} aria-label={`Написать в ${item.name}`} title={item.name}>
          <Image src={publicPath(item.icon)} alt="" width={36} height={36} unoptimized className={styles.messengerIcon} />
        </a>)}
      </div>
    </section>

    <section className={styles.location} aria-labelledby="location-title">
      <div className={styles.locationInfo}>
        <h2 id="location-title"><ContactIcon type="pin" />Как нас найти</h2>
        <address className={styles.address}>
          <span className={styles.region}>{contacts.region}</span>
          <span>{contacts.locality}</span>
          <span>{contacts.street}</span>
        </address>
        <div className={styles.hours}>
          <h3>Режим работы</h3>
          <dl>
            <div><dt>Понедельник — пятница</dt><dd>{contacts.hours}</dd></div>
            <div><dt>Суббота — воскресенье</dt><dd>Выходные</dd></div>
          </dl>
        </div>
        <a href={contactRouteUrl} target="_blank" rel="noopener noreferrer" className={`home-hero__link ${styles.routeButton}`}>Построить маршрут</a>
      </div>
      <ContactsMap />
    </section>

  </main>;
}
