import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ParkBanner from '@/sections/home/ParkBanner';


let visibility: DocumentVisibilityState;
beforeEach(() => {
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

function changeVisibility(value: DocumentVisibilityState) {
  act(() => { visibility = value; document.dispatchEvent(new Event('visibilitychange')); });
}

describe('homepage carousel media lifecycle', () => {
  it('ignores queued end events from a slide that is no longer selected', () => {
    const { container } = render(<ParkBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Слайд 3: Городская среда' }));
    const inactive = container.querySelector('video')!;
    Object.defineProperty(inactive, 'ended', { configurable: true, value: true });
    fireEvent.ended(inactive);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Инженерия для городской среды');
  });

  it('preserves the outgoing frame instead of rewinding it during the crossfade', () => {
    const { container } = render(<ParkBanner />);
    const video = container.querySelector('video')!;
    video.currentTime = 4;
    fireEvent.click(screen.getByRole('button', { name: 'Слайд 2: Среда для жизни' }));
    expect(video.currentTime).toBe(4);
  });

  it('does not advance while hidden and advances an ended video once upon return', async () => {
    const { container } = render(<ParkBanner />);
    const video = container.querySelector('video')!;
    changeVisibility('hidden');
    Object.defineProperty(video, 'ended', { configurable: true, value: true });
    fireEvent.ended(video);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Инженерные системы будущего');
    changeVisibility('visible');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Создаём среду для жизни'));
    fireEvent.ended(video);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Создаём среду для жизни');
  });

  it('retries interrupted play on return, without rewinding or removing the poster', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Interrupted', 'AbortError'));
    const { container } = render(<ParkBanner />);
    const video = container.querySelector('video')!;
    await act(async () => {});
    const before = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
    video.currentTime = 3;
    changeVisibility('hidden');
    changeVisibility('visible');
    await waitFor(() => expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBeGreaterThan(before));
    expect(video.currentTime).toBe(3);
    expect(container.querySelector('.park-banner__poster')).toHaveAttribute('src', '/images/home/hero-opening-poster.jpg');
  });
});
