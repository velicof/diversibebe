// Renders the orientative Romanian season calendar from src/features/v2/season.ts. Usage: node scripts/season-calendar.cjs [out.md]
const fs = require('node:fs'), path = require('node:path');
const { load } = require('../tests/load-ts.cjs');
const season = load('src/features/v2/season.ts');
const out = path.resolve(process.argv[2] || path.join(__dirname, '../docs/SEASONAL-CALENDAR.md'));
const symbol = { local: '●', depozit: '◐', 'tot-anul': '○', import: '·' };
const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
const rows = season.calendar().map((p) => `| ${p.name} | ${p.months.map((a) => symbol[a]).join(' | ')} |`);
const md = [
  '# Calendar sezonier orientativ — România', '',
  'Sursa de date: `src/features/v2/season.ts` (generat cu `node scripts/season-calendar.cjs`).', '',
  '**Legendă:** ● proaspăt local · ◐ disponibil din depozit · ○ disponibil tot anul (cămară, congelat, produse animale) · · preponderent importat', '',
  'Calendarul este editorial și orientativ (cultură în câmp deschis, depozitare obișnuită). Variază cu regiunea, anul și sera. **Nu este o regulă de siguranță:** în „Ce gătim azi?” și în planificator, sezonul doar reordonează rețetele deja eligibile, după siguranță, etapă, ingrediente, timp și preferințe (ponderea este plafonată la +1,5 / −1).', '',
  `| Produs | ${months.join(' | ')} |`, `|---|${months.map(() => ':-:').join('|')}|`, ...rows, '',
  '## De validat înainte de publicare', '',
  '- Verificare de către o persoană cu experiență în aprovizionarea din piețele românești (lunile de tranziție, sera).',
  '- Formularea „în sezon” rămâne orientativă în interfață; nu promitem prețuri sau disponibilitate în magazin.',
].join('\n');
fs.writeFileSync(out, md + '\n');
console.log('written', out, rows.length, 'products');
