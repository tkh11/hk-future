"use client";

import styles from "./Contacts.module.css";

export default function QuietLeadButton() {
  return (
    <button type="button" className={styles.lead} onClick={() => window.dispatchEvent(new Event("hk-open-lead"))}>
      Оставить заявку
    </button>
  );
}
