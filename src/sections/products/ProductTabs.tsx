'use client';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useHydrated } from '@/lib/use-hydrated';
import styles from './Products.module.css';

export type ProductTab = { id: string; label: string; content: ReactNode };

export default function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const id = useId();
  const ready = useHydrated();
  const [active, setActive] = useState(0);
  const [tableOpened, setTableOpened] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const previousHeight = useRef(0);
  const previousPill = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const motion = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const frame = viewport.current;
    const panel = panels.current[active];
    const pill = indicator.current;
    const button = buttons.current[active];
    if (!frame || !panel || !pill || !button) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const options = { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)' };
    const animate = (element: Element, keyframes: Keyframe[]) => {
      if (!reduced.matches && typeof element.animate === 'function') {
        motion.current = motion.current.filter(animation => animation.playState === 'running');
        motion.current.push(element.animate(keyframes, options));
      }
    };
    const measure = () => {
      const height = panel.getBoundingClientRect().height;
      if (previousHeight.current && Math.abs(previousHeight.current - height) > 1) {
        animate(frame, [{ height: `${previousHeight.current}px` }, { height: `${height}px` }]);
      }
      previousHeight.current = height;
      const next = { left: button.offsetLeft, top: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight };
      pill.style.height = `${next.height}px`;
      pill.style.width = `${next.width}px`;
      pill.style.transform = `translate(${next.left}px, ${next.top}px)`;
      if (previousPill.current && (previousPill.current.left !== next.left || previousPill.current.width !== next.width || previousPill.current.top !== next.top)) animate(pill, [
        { width: `${previousPill.current.width}px`, transform: `translate(${previousPill.current.left}px, ${previousPill.current.top}px)` },
        { width: `${next.width}px`, transform: `translate(${next.left}px, ${next.top}px)` },
      ]);
      previousPill.current = next;
    };
    const changing = previousPill.current !== null;
    measure();
    if (changing) animate(panel, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }]);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(button);
    if (button.parentElement) observer.observe(button.parentElement);
    const stopMotion = () => { motion.current.forEach(animation => animation.cancel()); motion.current = []; };
    reduced.addEventListener('change', stopMotion);
    return () => { observer.disconnect(); reduced.removeEventListener('change', stopMotion); stopMotion(); };
  }, [active]);

  function select(index: number) {
    if (index === active) return;
    // Capture the visible in-between height if the visitor switches again quickly.
    previousHeight.current = viewport.current?.getBoundingClientRect().height ?? 0;
    if (tabs[index].id === 'variants') setTableOpened(true);
    setActive(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
    buttons.current[next]?.focus({ preventScroll: true });
    buttons.current[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  return <div className={styles.details}>
    <div className={styles.tabsScroll}>
      <div className={styles.tabs} role="tablist" aria-label="Информация о товаре">
        <span ref={indicator} className={styles.tabIndicator} aria-hidden="true" />
        {tabs.map((tab, index) => <button key={tab.id} ref={node => { buttons.current[index] = node; }} type="button" role="tab" disabled={!ready}
          id={`${id}-tab-${tab.id}`} aria-controls={`${id}-panel-${tab.id}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
          onClick={() => select(index)} onKeyDown={event => onKeyDown(event, index)}>{tab.label}</button>)}
      </div>
    </div>
    <div ref={viewport} className={styles.panelViewport}>
      {tabs.map((tab, index) => <div key={tab.id} ref={node => { panels.current[index] = node; }} className={styles.tabPanel}
        role="tabpanel" id={`${id}-panel-${tab.id}`} aria-labelledby={`${id}-tab-${tab.id}`} tabIndex={0} hidden={index !== active}>
        {(tab.id !== 'variants' || tableOpened) && tab.content}
      </div>)}
    </div>
  </div>;
}
