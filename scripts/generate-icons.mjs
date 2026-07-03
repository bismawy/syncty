// Converts design/logo.svg to PNG icons at multiple sizes for the extension
// manifest (Chrome MV3 requires PNG; SVG not supported for toolbar icons).
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '..', 'design', 'logo.svg');
const outDir = resolve(__dirname, '..', 'extension', 'public', 'icons');

const svg = readFileSync(svgPath);

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const outPath = resolve(outDir, `logo-${size}.png`);
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(outPath);
  console.log(`wrote ${size}x${size} -> ${outPath}`);
}

console.log('done');
