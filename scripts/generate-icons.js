const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = fs.readFileSync("public/icons/mark.svg");
const maskSvg = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#BF6544"/>
  <circle cx="256" cy="256" r="28" fill="#F5F1EA"/>
  <circle cx="256" cy="256" r="118" fill="none" stroke="#FFFFFF" stroke-width="28"/>
  <circle cx="362" cy="168" r="26" fill="#FFFFFF"/>
</svg>`);

const outDir = "public/icons";

async function png(size, file, { maskable = false } = {}) {
  const input = maskable ? maskSvg : svg;
  await sharp(input).resize(size, size).png().toFile(path.join(outDir, file));
  console.log("wrote", file, size);
}

(async () => {
  await png(16, "icon-16.png");
  await png(32, "icon-32.png");
  await png(180, "icon-180.png");
  await png(192, "icon-192.png");
  await png(256, "icon-256.png");
  await png(384, "icon-384.png");
  await png(512, "icon-512.png");
  await png(512, "icon-512-maskable.png", { maskable: true });
  await sharp(svg).resize(512, 512).png().toFile("src/app/icon.png");
  // Next.js accepts PNG named favicon.ico in app/ for the /favicon.ico route in practice;
  // also write public copies for static PWA installs.
  await sharp(svg).resize(32, 32).png().toFile("src/app/favicon.ico");
  await sharp(svg).resize(32, 32).png().toFile("public/favicon.ico");
  await sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png");
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
