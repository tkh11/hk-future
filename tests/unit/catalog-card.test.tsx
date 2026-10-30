import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogArt, CatalogNode } from '@/lib/catalog';
import { catalog } from '@/content/catalog';
import CatalogCard from '@/sections/catalog/CatalogCard';

vi.mock('next/dynamic', () => ({ default: () => ({ kind }: { kind: string }) => <svg data-testid={`art-${kind}`} /> }));
vi.mock('@/lib/use-pointer-tilt', () => ({ usePointerTilt: () => ({ surfaceRef: { current: null }, pointerHandlers: {} }) }));

let visibility: DocumentVisibilityState;
let intersect: (visible: boolean) => void;
let reducedMotion: boolean;
let motionChanged: () => void;
beforeEach(() => {
  visibility = 'visible';
  reducedMotion = false;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => visibility === 'hidden');
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      intersect = visible => this.callback([{ isIntersecting: visible, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      intersect(true);
    }
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reducedMotion; }, addEventListener(_: string, callback: () => void) { motionChanged = callback; }, removeEventListener() {} }));
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

  it('resumes after a rapid tab switch even when React batches visibility events', async () => {
    const { container } = covers([catalog[0]]);
    await act(async () => {});
    const video = container.querySelector('video')!;
    video.currentTime = 3;
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    act(() => {
      visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(play).toHaveBeenCalled();
    expect(video.currentTime).toBe(3);
    expect(video).toBeInTheDocument();
  });

  it('keeps a separate poster visible while suspended, buffering or failing', async () => {
    const { container } = covers([catalog[0]]);
    await act(async () => {});
    const video = container.querySelector('video')!;
    const poster = container.querySelector('img');
    expect(poster).toHaveAttribute('src', '/images/catalog/pipes-poster.jpg');
    Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
    fireEvent.playing(video);
    expect(video).toHaveAttribute('data-ready', 'true');
    act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    expect(video).toHaveAttribute('data-ready', 'false');
    fireEvent.playing(video);
    expect(video).toHaveAttribute('data-ready', 'false');
    act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
    fireEvent.playing(video);
    fireEvent.waiting(video);
    expect(video).toHaveAttribute('data-ready', 'false');
    fireEvent.error(video);
    expect(poster).toBeInTheDocument();
    expect(screen.getByRole('link', { name: catalog[0].title })).toBeInTheDocument();
  });

  it('does not resume offscreen or with reduced motion and resumes when allowed again', async () => {
    covers([catalog[0]]);
    await act(async () => {});
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    act(() => intersect(false));
    play.mockClear();
    act(() => {
      visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(play).not.toHaveBeenCalled();
    act(() => { reducedMotion = true; intersect(true); });
    expect(play).not.toHaveBeenCalled();
    act(() => { reducedMotion = false; motionChanged(); });
    expect(play).toHaveBeenCalled();
  });

  it('ignores an old rejected play request after successful resumption', async () => {
    let rejectOldPlay!: (error: DOMException) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise((_, reject) => { rejectOldPlay = reject; }));
    const { container } = covers([catalog[0]]);
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
    act(() => {
      visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    });
    fireEvent.playing(video);
    expect(video).toHaveAttribute('data-ready', 'true');
    await act(async () => rejectOldPlay(new DOMException('Interrupted', 'AbortError')));
    expect(video).toHaveAttribute('data-ready', 'true');
  });

  it('reveals video only after a decoded frame and cancels frame callbacks while hidden', async () => {
    const { container } = covers([catalog[0]]);
    await act(async () => {});
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'readyState', { configurable: true, value: 4 });
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    let showFrame!: VideoFrameRequestCallback;
    video.requestVideoFrameCallback = vi.fn(callback => { showFrame = callback; return 42; });
    video.cancelVideoFrameCallback = vi.fn();
    fireEvent.playing(video);
    expect(video).toHaveAttribute('data-ready', 'false');
    act(() => showFrame(0, {} as VideoFrameCallbackMetadata));
    expect(video).toHaveAttribute('data-ready', 'true');
    fireEvent.waiting(video);
    fireEvent.playing(video);
    act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(42);
    act(() => showFrame(0, {} as VideoFrameCallbackMetadata));
    expect(video).toHaveAttribute('data-ready', 'false');
    act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
    fireEvent.playing(video);
    act(() => showFrame(0, {} as VideoFrameCallbackMetadata));
    expect(video).toHaveAttribute('data-ready', 'true');
  });
});
