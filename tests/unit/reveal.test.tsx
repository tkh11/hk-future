import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Link from "next/link";
import RevealBlock from '@/components/ui/RevealBlock';
import ViewportMount from '@/components/ui/ViewportMount';
let callback: IntersectionObserverCallback;
afterEach(() => vi.unstubAllGlobals());
function observer() {
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IntersectionObserverCallback) { callback = cb; }
    observe() {} disconnect() {} unobserve() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
}
it('keeps text and links usable even when an image fails', () => {
  observer();
  render(<RevealBlock kind="test"><h2>Текст раздела</h2><img src="/missing.jpg" alt="Товар" /><Link href="/catalog">Каталог</Link></RevealBlock>);
  screen.getByRole('img').dispatchEvent(new Event('error'));
  expect(screen.getByRole('heading')).toBeVisible();
  expect(screen.getByRole('link')).not.toHaveAttribute('inert');
});
it('mounts heavy media only after intersection and keeps it mounted', () => {
  observer();
  render(<ViewportMount fallback={<span>Загрузка</span>}><span>Тяжёлая модель</span></ViewportMount>);
  expect(screen.queryByText('Тяжёлая модель')).toBeNull();
  act(() => callback([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(screen.getByText('Тяжёлая модель')).toBeVisible();
});
