/**
 * generate-icons.mjs — Generate the PWA icons from the brand shrine icon.
 *
 * Produces public/pwa-192x192.png, public/pwa-512x512.png, and
 * public/apple-touch-icon.png.
 *
 * Usage:  node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const BG = '#1a5c4e';
const FG = '#ffffff';

function makeSvg(size) {
  const padding = Math.round(size * 0.18);
  const iconSize = size - 2 * padding;
  const scale = iconSize / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}" rx="${Math.round(size * 0.15)}"/>
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <path fill="${FG}" d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z"/>
  </g>
</svg>`;
}

const icons = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of icons) {
  const svg = Buffer.from(makeSvg(size));
  const outPath = join(PUBLIC, name);
  await sharp(svg).png().toFile(outPath);
  console.log(`✓ Generated ${name} (${size}×${size})`);
}

console.log('Done. Commit the generated PNG files in public/.');
