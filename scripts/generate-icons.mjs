import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public/icons/mark.svg");
const outDir = path.join(root, "public/icons");

mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 180, 192, 256, 384, 512];

for (const size of sizes) {
  await sharp(svgPath).resize(size, size).png().toFile(path.join(outDir, `icon-${size}.png`));
}

// Maskable icon: same mark with extra safe-area padding (per PWA maskable spec, ~40% padding).
await sharp(svgPath)
  .resize(320, 320)
  .extend({ top: 96, bottom: 96, left: 96, right: 96, background: "#BF6544" })
  .png()
  .toFile(path.join(outDir, "icon-512-maskable.png"));

// Next.js file-convention favicon: src/app/icon.png is auto-served as the tab icon.
await sharp(svgPath).resize(256, 256).png().toFile(path.join(root, "src/app/icon.png"));

console.log("Icons generated in public/icons/");
