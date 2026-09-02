import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const images = JSON.parse(fs.readFileSync(path.join(root, "data", "images.json"), "utf8"));

function stripBrandClaims(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/Aunty Hong'?s/gi, "Uncle Lan's")
    .replace(/Aunty Hong/gi, "Uncle Lan")
    .replace(/Auntie Hong/gi, "Uncle Lan")
    .replace(/阿嫲红/g, "Uncle Lan")
    .replace(/阿嫲/g, "Uncle Lan")
    .replace(/Golden Aunty Hong Tin/gi, "Golden Tin")
    .replace(/Orange Aunty Hong Tin/gi, "Orange Tin")
    .replace(/Red Aunty Hong Tin/gi, "Red Tin")
    .replace(/Golden Uncle Lan Tin/gi, "Golden Tin")
    .replace(/Orange Uncle Lan Tin/gi, "Orange Tin")
    .replace(/Red Uncle Lan Tin/gi, "Red Tin")
    .replace(/auntyhong\.sg/gi, "this demo shop");
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8"));
for (const row of catalog) {
  row.title = stripBrandClaims(row.title);
  row.excerpt = stripBrandClaims(row.excerpt);
  if (Array.isArray(row.variants)) {
    for (const v of row.variants) {
      if (v.attrs && typeof v.attrs === "object") {
        for (const k of Object.keys(v.attrs)) v.attrs[k] = stripBrandClaims(v.attrs[k]);
      }
    }
  }
  if (Array.isArray(row.additionalFields)) {
    for (const f of row.additionalFields) {
      f.title = stripBrandClaims(f.title || "");
      if (Array.isArray(f.options)) f.options = f.options.map(stripBrandClaims);
    }
  }
}
fs.writeFileSync(path.join(root, "data", "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log("catalog.json updated");

const deskPath = path.join(root, "data", "desk.json");
const desk = JSON.parse(fs.readFileSync(deskPath, "utf8"));
if (Array.isArray(desk.products)) {
  desk.products = desk.products.map((p) => {
    const local = images.products[p.slug] || images.named["cny-banner"];
    const next = { ...p };
    next.title = stripBrandClaims(next.title || "");
    next.description = stripBrandClaims(next.description || "");
    if (local) next.image = local;
    if (Array.isArray(next.variants)) {
      next.variants = next.variants.map((v) => ({ ...v, label: stripBrandClaims(v.label || "") }));
    }
    if (Array.isArray(next.additionalFields)) {
      next.additionalFields = next.additionalFields.map((f) => ({
        ...f,
        title: stripBrandClaims(f.title || ""),
        options: Array.isArray(f.options) ? f.options.map(stripBrandClaims) : [],
      }));
    }
    return next;
  });
  desk.version = (Number(desk.version) || 0) + 1;
}
fs.writeFileSync(deskPath, JSON.stringify(desk) + "\n");
console.log("desk.json updated", desk.products?.length, "version", desk.version);
const left = (fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8") + fs.readFileSync(deskPath, "utf8")).match(/Aunty\s*Hong|Auntie\s*Hong|阿嫲|squarespace-cdn/gi) || [];
console.log("leftover hits", left.length, left.slice(0, 8));
