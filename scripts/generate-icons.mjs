import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const svg = await readFile(fileURLToPath(new URL('../public/favicon.svg', import.meta.url)));

const targets = [
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon.png']
];

for (const [size, name] of targets) {
  const out = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
  await sharp(svg, { density: 288 }).resize(size, size).png().toFile(out);
  console.log(`wrote public/${name}`);
}
