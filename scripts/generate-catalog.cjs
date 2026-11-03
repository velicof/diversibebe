// Writes src/features/v2/content/catalog.generated.json from catalog-build.ts (same rules, computed once).
//   node scripts/generate-catalog.cjs          regenerate after changing recipes, corrections, safety rules or reviews
//   node scripts/generate-catalog.cjs --check  exit 1 when the committed file is stale (build, tests, release check)
const fs = require('node:fs'), path = require('node:path');
const { loader } = require('../tests/load-ts.cjs');
const file = path.join(__dirname, '../src/features/v2/content/catalog.generated.json');

function render() {
  // The content mode only changes which photos are shown, which catalog.ts resolves at runtime.
  const data = loader({ NEXT_PUBLIC_V2_CONTENT_MODE: '' })('src/features/v2/catalog-build.ts').buildCatalogData();
  const plain = JSON.parse(JSON.stringify(data));
  // One recipe per line keeps review diffs readable.
  return `{"recipes":[\n${plain.recipes.map((r) => JSON.stringify(r)).join(',\n')}\n],\n"ingredientFilters":${JSON.stringify(plain.ingredientFilters)}}\n`;
}

if (require.main === module) {
  const next = render();
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  if (process.argv.includes('--check')) {
    if (current !== next) {
      console.error('catalog.generated.json is stale: run node scripts/generate-catalog.cjs');
      process.exit(1);
    }
    console.log('catalog.generated.json is up to date');
  } else {
    fs.writeFileSync(file, next);
    console.log(`catalog.generated.json: ${JSON.parse(next).recipes.length} recipes, ${(next.length / 1024).toFixed(0)} KB`);
  }
}
module.exports = { render, file };
