import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "public", "products");
fs.mkdirSync(outDir, { recursive: true });

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8"));
const images = JSON.parse(fs.readFileSync(path.join(root, "data", "images.json"), "utf8"));

const titles = {};
for (const row of catalog) {
  const slug = String(row.url || "").replace("/store/p/", "");
  titles[slug] = row.title;
}
for (const slug of Object.keys(images.products || {})) {
  if (!titles[slug]) titles[slug] = slug.replace(/-/g, " ");
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxLen = 28) {
  const words = String(title).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function productSvg(title, accent = "#8B1E1E") {
  const lines = wrapTitle(title);
  const lineXml = lines
    .map(
      (line, i) =>
        `<text x="60" y="${520 + i * 42}" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#FBF6EE">${escapeXml(line)}</text>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3A2418"/>
      <stop offset="55%" stop-color="#2A1B14"/>
      <stop offset="100%" stop-color="#1A100C"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#B8963E" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#B8963E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="900" fill="url(#bg)"/>
  <rect width="900" height="900" fill="url(#glow)"/>
  <rect x="36" y="36" width="828" height="828" fill="none" stroke="#B8963E" stroke-opacity="0.55" stroke-width="2"/>
  <rect x="52" y="52" width="796" height="796" fill="none" stroke="#E8DCC8" stroke-opacity="0.18" stroke-width="1"/>
  <circle cx="450" cy="290" r="118" fill="${accent}" fill-opacity="0.92"/>
  <circle cx="450" cy="290" r="128" fill="none" stroke="#B8963E" stroke-width="3"/>
  <text x="450" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#FBF6EE">Uncle</text>
  <text x="450" y="328" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#FBF6EE">Lan</text>
  <text x="60" y="470" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="16" letter-spacing="4" fill="#B8963E">UNCLE LAN KITCHEN · DEMO</text>
  ${lineXml}
  <text x="60" y="820" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="14" letter-spacing="3" fill="#E8DCC8" fill-opacity="0.55">SINGAPORE CNY SNACKS</text>
</svg>`;
}

function bannerSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A1B14"/>
      <stop offset="100%" stop-color="#5C1A1A"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect x="48" y="48" width="1504" height="804" fill="none" stroke="#B8963E" stroke-opacity="0.5" stroke-width="2"/>
  <text x="120" y="360" font-family="Georgia, serif" font-size="92" fill="#FBF6EE">Uncle Lan</text>
  <text x="120" y="440" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="28" letter-spacing="6" fill="#B8963E">KITCHEN DEMO · CNY GIFTS</text>
  <text x="120" y="520" font-family="Georgia, serif" font-size="36" fill="#E8DCC8" fill-opacity="0.8">Snacks that taste like home.</text>
</svg>`;
}

function logoSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#2A1B14"/>
  <circle cx="256" cy="230" r="120" fill="#8B1E1E"/>
  <circle cx="256" cy="230" r="132" fill="none" stroke="#B8963E" stroke-width="6"/>
  <text x="256" y="218" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#FBF6EE">Uncle</text>
  <text x="256" y="272" text-anchor="middle" font-family="Georgia, serif" font-size="54" fill="#FBF6EE">Lan</text>
  <text x="256" y="420" text-anchor="middle" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="18" letter-spacing="4" fill="#B8963E">DEMO</text>
</svg>`;
}

function noodlesSvg() {
  return productSvg("Handmade noodles", "#6B3A2A");
}

function goldTinSvg() {
  return productSvg("Gold tin gift", "#B8963E");
}

const accents = ["#8B1E1E", "#6B3A2A", "#7A4E1E", "#5C1A1A", "#8B4513", "#9C2F2F"];

async function writeWebp(name, svg) {
  const dest = path.join(outDir, `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(dest);
  return `/products/${name}.webp`;
}

const productPaths = {};
let i = 0;
for (const [slug, title] of Object.entries(titles)) {
  const accent = accents[i % accents.length];
  i += 1;
  productPaths[slug] = await writeWebp(slug, productSvg(title, accent));
  console.log("product", slug);
}

const named = {
  "cny-banner": await writeWebp("cny-banner", bannerSvg()),
  logo: await writeWebp("logo", logoSvg()),
  noodles: await writeWebp("noodles", noodlesSvg()),
  "gold-tin": await writeWebp("gold-tin", goldTinSvg()),
};

// favicon
await sharp(Buffer.from(logoSvg())).resize(64, 64).png().toFile(path.join(root, "public", "favicon.png"));
await sharp(Buffer.from(logoSvg())).resize(180, 180).png().toFile(path.join(root, "public", "apple-touch-icon.png"));

const nextImages = { products: productPaths, named };
fs.writeFileSync(path.join(root, "data", "images.json"), JSON.stringify(nextImages, null, 2) + "\n");
console.log("wrote images.json and", Object.keys(productPaths).length, "products");
