import type { NextConfig } from "next";
import { withPayload } from '@payloadcms/next/withPayload';

// GitHub Pages is served from /hk-future. Local `next dev` and Vercel builds
// leave this unset, so they keep the site at the domain root.
const githubPages = process.env.GITHUB_PAGES === "true";
const basePath = "/hk-future";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
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

const config = githubPages ? nextConfig : withPayload(nextConfig);
const payloadHeaders = config.headers;

if (!githubPages && payloadHeaders) {
  // Payload needs theme negotiation in Admin. Making it critical on public
  // pages causes Chrome to repeat the first request and its server-side work.
  config.headers = async () => (await payloadHeaders()).flatMap(rule => {
    if (rule.source !== "/:path*") return [rule];
    const criticalHeaders = rule.headers.filter(header =>
      header.key.toLowerCase() === "critical-ch"
      && header.value === "Sec-CH-Prefers-Color-Scheme",
    );
    if (!criticalHeaders.length) return [rule];
    return [
      { ...rule, headers: rule.headers.filter(header => !criticalHeaders.includes(header)) },
      { ...rule, source: "/admin/:path*", headers: criticalHeaders },
    ];
  });
}

export default config;
