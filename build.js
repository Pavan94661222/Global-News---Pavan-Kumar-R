/* ============================================================
   GLOBALNEWS | Netlify build
   ------------------------------------------------------------
   Copies only the front-end assets into dist/, which is what
   Netlify publishes. server.js, the functions, node_modules and
   .env deliberately stay out of the published output so the API
   keys can never be downloaded from the live site.
   ============================================================ */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const ASSETS = ["index.html", "html", "css", "js", "favicon"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copied = [];
for (const asset of ASSETS) {
    const from = path.join(ROOT, asset);
    if (!fs.existsSync(from)) continue;
    fs.cpSync(from, path.join(OUT, asset), { recursive: true });
    copied.push(asset);
}

console.log(`GLOBALNEWS build complete -> dist/ (${copied.join(", ")})`);
