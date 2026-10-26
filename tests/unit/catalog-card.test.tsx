import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogArt, CatalogNode } from '@/lib/catalog';
import { catalog } from '@/content/catalog';
import CatalogCard from '@/sections/catalog/CatalogCard';

vi.mock('next/dynamic', () => ({ default: () => ({ kind }: { kind: string }) => <svg data-testid={`art-${kind}`} /> }));
vi.mock('@/lib/use-pointer-tilt', () => ({ usePointerTilt: () => ({ surfaceRef: { current: null }, pointerHandlers: {} }) }));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) { this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

function covers(nodes: CatalogNode[]) {
  return render(<ul>{nodes.map(node => <CatalogCard key={node.slug} cover entry={{ node, path: [node.slug], trail: [node] }} />)}</ul>);
}

describe('editable root category covers', () => {
  it('keeps the three seeded category videos unchanged', () => {
    const { container } = covers(catalog);
    expect([...container.querySelectorAll('video')].map(video => video.getAttribute('src'))).toEqual([
      '/videos/catalog/pipes.mp4', '/videos/catalog/pumpscategory.mp4', '/videos/catalog/accessories.mp4',
    ]);
  });

  it('renders every CMS artwork choice at the root without an undefined video URL', () => {
    const arts: CatalogArt[] = ['pipes', 'layers', 'pump', 'circulation', 'borehole', 'drainage', 'station', 'automation', 'auxiliary'];
    const { container } = covers(arts.map(art => ({ slug: art, title: art, art })));
    expect(screen.getAllByRole('link')).toHaveLength(9);
    for (const art of ['layers', 'circulation', 'borehole', 'drainage', 'station', 'automation']) expect(screen.getByTestId(`art-${art}`)).toBeInTheDocument();
    expect(container.querySelectorAll('video')).toHaveLength(3);
    expect(container.innerHTML).not.toContain('undefined');
  });

  it('honors a CMS image instead of the default video for that artwork', () => {
    const { container } = covers([{ slug: 'custom-pipes', title: 'Новая категория', art: 'pipes', image: '/api/media/file/custom-cover.png' }]);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/media/file/custom-cover.png');
    expect(screen.getByRole('link', { name: 'Новая категория' })).toHaveAttribute('href', '/catalog/custom-pipes');
  });
});
