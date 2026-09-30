import type { NextConfig } from "next";

// GitHub Pages is served from /hk-future. Local `next dev` and Vercel builds
// leave this unset, so they keep the site at the domain root.
const githubPages = process.env.GITHUB_PAGES === "true";
const basePath = "/hk-future";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(githubPages
    ? {
        output: "export",
        basePath,
        assetPrefix: `${basePath}/`,
        trailingSlash: true,
      }
    : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    ...(githubPages ? { unoptimized: true } : {}),
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: githubPages ? basePath : "",
  },
};

export default nextConfig;
