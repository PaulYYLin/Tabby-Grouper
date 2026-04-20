import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'icons/icon.svg');
const outDir = resolve(root, 'public/icons');

await mkdir(outDir, { recursive: true });
const svg = await readFile(src);

for (const size of [16, 48, 128]) {
  const out = resolve(outDir, `${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`wrote ${out}`);
}
