// Converts SVG logos to PNG icons at multiple sizes for the extension
// manifest and toolbar (Chrome MV3 requires PNG; SVG not supported for toolbar icons).
// Run: bun run --filter syncty-extension icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const darkSvgPath = resolve(__dirname, '..', 'design', 'logo_mark_dark.svg');
const lightSvgPath = resolve(__dirname, '..', 'design', 'logo_mark_light.svg');
const faviconPath = resolve(__dirname, '..', '..', 'SYNCTY_CLIENT_FILES', '03_Digital_Assets', 'Favicons', 'Syncty_Favicon_Primary.png');
const outDir = resolve(__dirname, '..', 'extension', 'public', 'icons');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const outPath = resolve(outDir, `logo-${size}.png`);
  await sharp(faviconPath)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(outPath);
  console.log(`wrote ${size}x${size} favicon icon -> ${outPath}`);
}

console.log('done');

