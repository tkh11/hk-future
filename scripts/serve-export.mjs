import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

// Local production-export preview only; no SPA fallback or development compiler.
const root = await realpath(resolve(process.env.EXPORT_DIR || "out"));
const prefix = (process.env.E2E_BASE_PATH ?? "/hk-future").replace(/\/$/, "");
const port = Number(process.env.PORT || 3100);
if ((prefix && !/^\/[a-zA-Z0-9_/-]+$/.test(prefix)) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid E2E_BASE_PATH or PORT");
}

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".webm": "video/webm", ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json", ".wasm": "application/wasm", ".riv": "application/octet-stream",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

function withinRoot(path) {
  const location = relative(root, path);
  return location !== ".." && !location.startsWith(`..${sep}`) && !location.startsWith(sep);
}

async function findFile(location) {
  const candidates = [location, resolve(location, "index.html"), `${location}.html`];
  for (const candidate of candidates) {
    if (!withinRoot(candidate)) continue;
    try {
      // A symlink inside out must not expose a file outside the export.
      const path = await realpath(candidate);
      if (!withinRoot(path)) continue;
      const info = await stat(path);
      if (info.isFile()) return { path, size: info.size };
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent((request.url || "/").split("?")[0]); }
    catch { response.writeHead(400).end(); return; }
    // Validate before URL/path normalization, including encoded dot segments.
    if (!pathname.startsWith("/") || pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").includes("..")) {
      response.writeHead(400).end();
      return;
    }
    if (prefix && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      response.writeHead(404).end();
      return;
    }
    const local = resolve(root, `.${pathname.slice(prefix.length) || "/"}`);
    const file = withinRoot(local) ? await findFile(local) : null;
    if (!file) { response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    let start = 0;
    let end = file.size - 1;
    let status = 200;
    const headers = {
      "Content-Type": types[extname(file.path)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (range && (range[1] || range[2])) {
        if (!range[1]) start = Math.max(0, file.size - Number(range[2]));
        else { start = Number(range[1]); end = range[2] ? Math.min(end, Number(range[2])) : end; }
      }
      if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) {
        response.writeHead(416, { "Content-Range": `bytes */${file.size}` }).end();
        return;
      }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${file.size}`;
    }
    headers["Content-Length"] = file.size === 0 ? 0 : end - start + 1;
    response.writeHead(status, headers);
    if (request.method === "HEAD" || file.size === 0) { response.end(); return; }
    const stream = createReadStream(file.path, { start, end });
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    console.error("Export preview request failed:", error.message);
    if (!response.headersSent) response.writeHead(500).end();
    else response.destroy();
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Static export: http://127.0.0.1:${port}${prefix}/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
