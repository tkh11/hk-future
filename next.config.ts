import type { NextConfig } from "next";
import { withPayload } from '@payloadcms/next/withPayload';

// GitHub Pages is served from /hk-future. Local `next dev` and Vercel builds
// leave this unset, so they keep the site at the domain root.
const githubPages = process.env.GITHUB_PAGES === "true";
const basePath = "/hk-future";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: process.env.CMS_SERVER_URL ? [new URL(process.env.CMS_SERVER_URL).hostname] : [],
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
  // Critical-CH on every path made Chrome replay the first document request.
  config.headers = async () => (await payloadHeaders()).map(rule => {
    if (rule.source !== "/:path*") return rule;
    return {
      ...rule,
      headers: rule.headers.filter(header => header.key.toLowerCase() !== "critical-ch"),
    };
  });
}

export default config;
