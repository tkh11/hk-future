export const PAGE_SCROLL_EVENT = "heisskraft:scroll-to";
export type PageScrollEvent = CustomEvent<{ top: number }>;

export function scrollPageTo(top: number) {
  const request: PageScrollEvent = new CustomEvent(PAGE_SCROLL_EVENT, {
    detail: { top },
    cancelable: true,
  });

  // Let the site's smooth-scroll controller handle the movement when mounted.
  if (!window.dispatchEvent(request)) return;
  window.scrollTo({
    top,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}
