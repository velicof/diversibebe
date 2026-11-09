// Pre-generates responsive WebP variants for the static V2 images shown with next/image, so pages get
// small images without any image-optimisation service (Vercel's is paid beyond the free quota).
//   node scripts/static-image-variants.cjs          writes public/v2/<name>-<width>.webp
//   node scripts/static-image-variants.cjs --check  fails if a variant is missing
// The list must match src/image-loader.ts.
const fs = require('node:fs'), path = require('node:path');
const { STATIC_VARIANTS } = require('../src/image-variants.json');
const root = path.resolve(__dirname, '..', 'public');
const check = process.argv.includes('--check');
(async () => {
  const sharp = check ? null : require('sharp');
  let missing = 0;
  for (const [src, widths] of Object.entries(STATIC_VARIANTS)) {
    for (const width of widths) {
      const out = path.join(root, src.replace(/\.webp$/, `-${width}.webp`));
      if (check) { if (!fs.existsSync(out)) { console.error('missing ' + out); missing++; } continue; }
      await sharp(path.join(root, src)).resize({ width, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
      console.log(`${path.relative(root, out)} ${Math.round(fs.statSync(out).size / 1024)} KB`);
    }
  }
  if (missing) process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
