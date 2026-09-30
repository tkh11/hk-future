/**
 * Prefix a file from /public so it resolves both at the domain root
 * (local dev, Vercel) and under /hk-future on GitHub Pages.
 */
export function publicPath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
