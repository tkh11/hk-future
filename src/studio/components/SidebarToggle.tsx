'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ChevronLeftIcon } from './icons';
import css from './Shell.module.css';

const KEY = 'studio-sidebar:v1';
const EVENT = 'studio-sidebar';

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function collapsedNow() {
  return document.documentElement.dataset.studioSidebar === 'collapsed';
}

function applyCollapsed(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) root.dataset.studioSidebar = 'collapsed';
  else delete root.dataset.studioSidebar;
  try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch { /* private mode or a full quota */ }
  window.dispatchEvent(new Event(EVENT));
}

export function rememberSidebar() {
  try {
    if (localStorage.getItem(KEY) === '1') document.documentElement.dataset.studioSidebar = 'collapsed';
  } catch { /* the inline script already applied the saved width when storage is readable */ }
}

export default function SidebarToggle() {
  const collapsed = useSyncExternalStore(subscribe, collapsedNow, () => false);

  useEffect(() => {
    rememberSidebar();
    window.dispatchEvent(new Event(EVENT));
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.studioSidebarReady = '';
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      className={css.collapse}
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      aria-controls="studio-nav"
      onClick={() => applyCollapsed(!collapsedNow())}
    >
      <ChevronLeftIcon className={css.icon} />
      <span data-sidebar-text>Свернуть</span>
    </button>
  );
}
