"use client";

import { createPortal } from "react-dom";
import styles from "./ModelFailure.module.css";

export default function ModelFailure({ onRetry, portalTargetId }: { onRetry: () => void; portalTargetId?: string }) {
  // Model errors occur after the client viewport has mounted, so its recovery
  // outlet already exists. A missing outlet safely retains the local fallback.
  const target = portalTargetId && typeof document !== "undefined" ? document.getElementById(portalTargetId) : null;
  const content = <div className={`${styles.failure}${target ? ` ${styles.inline}` : ""}`} role="alert" data-model-status="error">
    <p>Не удалось показать модель. Описания элементов доступны в панели.</p>
    <button type="button" className="home-hero__link" onClick={onRetry}>Попробовать снова</button>
  </div>;
  return target ? createPortal(content, target) : content;
}
