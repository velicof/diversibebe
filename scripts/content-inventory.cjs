// Editorial inventory of the existing recipe catalog. Heuristic only: it never grants clinical approval.
// Usage: node scripts/content-inventory.cjs [outDir]   (writes src/features/v2/content/shortlist.ts too)
const fs = require('node:fs'), path = require('node:path');
const { load } = require('../tests/load-ts.cjs');
const { catalog } = load('src/features/v2/catalog.ts');
const { normalize } = load('src/features/v2/review.ts');
const season = load('src/features/v2/season.ts');

const repo = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(repo, '../../outputs/master-2026-11-01/content'));
fs.mkdirSync(outDir, { recursive: true });

const QUOTA = { 'mic-dejun': 22, pranz: 32, cina: 24, gustare: 12 }; // 90 total, spread across meals
const riskRules = [
  [/\bmiere\b/, 'miere'], [/(?<!fara )\bsare\b/, 'sare'], [/(?<!fara )\bzahar\b/, 'zahăr'], [/sos de soia/, 'sos de soia'],
  [/\bnuc[ia]?\b|alun|migdal|arahid|caju|fistic/, 'nuci/semințe oleaginoase'], [/\bstrugur/, 'struguri (formă)'],
  [/rosii cherry|rosii cherr/, 'roșii cherry (formă)'], [/\bou(?:a|ale)?\b/, 'ou (alergen)'],
  [/\blapte\b|\biaurt|\bbranz|\bunt\b|\bsmantan|\bmascarpone|\bcas\b|\bparmezan/, 'lactate (alergen)'],
  [/\bgris\b|\bfaina\b|\bpaine\b|\bpaste\b|\bgrau\b|\borz\b|\bsecara\b|\bpesmet/, 'gluten'],
  [/\bpeste\b|\bsomon|\bcod\b|\bpastrav|\bton\b|\bsardin|\bhering/, 'pește (alergen, mercur)'],
  [/\bsusan|\btahini/, 'susan (alergen)'], [/\bsoia\b|\btofu/, 'soia (alergen)'],
  [/carnat|salam|parizer|sunca|bacon|mezel/, 'mezeluri/sare'], [/ou crud|nepasteurizat|lapte crud/, 'ingredient crud'],
];
const quantity = /\d|jumatate|un sfert|o lingur|o lingurit|un pahar|o cana|un varf|o bucat|o felie|un ou|o mana/;
const optionalLine = /dupa gust|optional|pentru servire|pentru decor/;

const rows = catalog.map((r) => {
  const lines = r.ingredients;
  const ingText = normalize(lines.join('\n'));
  const withQty = lines.filter((l) => quantity.test(normalize(l))).length;
  const risks = [...new Set(riskRules.filter(([re]) => re.test(ingText)).map(([, label]) => label))];
  for (const a of r.allergens || []) if (!risks.some((x) => normalize(x).startsWith(normalize(a).slice(0, 4)))) risks.push(`alergen declarat: ${a}`);
  if (r.automaticReview.status !== 'no-automatic-issues') risks.push(...r.automaticReview.reasons);
  const detected = season.detectProduce(lines);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const localMonths = new Set(months.filter((m) => detected.some((p) => season.availability(p, m) === 'local')));
  const importOnly = detected.filter((p) => !p.allYear && !(p.local || []).length && !(p.depozit || []).length).map((p) => p.name);
  const issues = [];
  if (r.minutes === null) issues.push('timp neclar');
  else if (r.minutes > 30) issues.push(`timp ${r.minutes} min`);
  if (lines.length < 3) issues.push('prea puține ingrediente');
  if (lines.length > 9) issues.push(`${lines.length} ingrediente`);
  if (withQty / Math.max(1, lines.length) < 0.7) issues.push('cantități lipsă');
  if (r.steps.length < 2) issues.push('pași insuficienți');
  if (r.steps.length > 9) issues.push(`${r.steps.length} pași`);
  if (r.steps.some((s) => s.length > 320)) issues.push('pas foarte lung');
  if (!r.storage || r.storage.length < 10) issues.push('fără păstrare');
  const servingsClear = typeof r.servings === 'number' || /\d/.test(String(r.servings));
  if (!servingsClear) issues.push('porții neclare');
  if (importOnly.length) issues.push(`import: ${importOnly.join(', ')}`);
  let score = 0;
  if (lines.length >= 4 && lines.length <= 8) score += 3; else if (lines.length <= 9) score += 1;
  if (r.minutes !== null && r.minutes <= 20) score += 3; else if (r.minutes !== null && r.minutes <= 30) score += 2;
  if (r.steps.length >= 3 && r.steps.length <= 7) score += 2;
  if (withQty / Math.max(1, lines.length) >= 0.7) score += 2;
  if (r.storage && r.storage.length >= 10) score += 1;
  if (servingsClear) score += 1;
  if (localMonths.size >= 3) score += 1;
  score -= importOnly.length;
  if (lines.some((l) => optionalLine.test(normalize(l)))) score -= 0.5;
  const eligible = r.automaticReview.status === 'no-automatic-issues' && r.minutes !== null && r.minutes <= 30 && lines.length >= 3 && lines.length <= 9 && r.steps.length >= 2;
  return {
    id: r.id, name: r.name, mealType: r.mealType, age: r.age, minimumMonths: r.minimumMonths, minutes: r.minutes,
    ingredients: lines.length, steps: r.steps.length, quantified: `${withQty}/${lines.length}`, servings: r.servings,
    automatic: r.automaticReview.status, photo: !r.image.endsWith('icon.svg'), localMonths: [...localMonths].join(' '),
    risks, issues, score, eligible, key: normalize(r.name).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2).sort().join(' '),
    ingredientKey: [...new Set(detected.map((p) => p.id))].sort().join('+'),
  };
});

// Duplicates: same normalized title words, or same detected produce set + same meal + same minimum age.
const dupes = [];
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const a = rows[i], b = rows[j];
  const wa = new Set(a.key.split(' ')), wb = new Set(b.key.split(' '));
  const inter = [...wa].filter((w) => wb.has(w)).length, union = new Set([...wa, ...wb]).size;
  const sameTitle = union && inter / union >= 0.8;
  const sameShape = a.ingredientKey && a.ingredientKey === b.ingredientKey && a.mealType === b.mealType && a.minimumMonths === b.minimumMonths && inter / union >= 0.5;
  if (sameTitle || sameShape) dupes.push([a, b, sameTitle ? 'titlu aproape identic' : 'aceleași ingrediente principale']);
}
const dupOf = new Map();
for (const [a, b] of dupes) { const keep = b.score > a.score ? b : a, drop = keep === a ? b : a; if (!dupOf.has(drop.id)) dupOf.set(drop.id, keep.id); }

const shortlist = [];
for (const [meal, quota] of Object.entries(QUOTA)) {
  const pool = rows.filter((r) => r.mealType === meal && r.eligible && !dupOf.has(r.id))
    .sort((a, b) => b.score - a.score || a.minutes - b.minutes || a.id.localeCompare(b.id));
  // Keep every stage represented: first pass takes the best two per minimum age, then fills by score.
  const picked = [];
  for (const age of [...new Set(pool.map((r) => r.minimumMonths))].sort((a, b) => a - b)) picked.push(...pool.filter((r) => r.minimumMonths === age).slice(0, 2));
  for (const r of pool) if (picked.length < quota && !picked.includes(r)) picked.push(r);
  shortlist.push(...picked.slice(0, quota));
}
const inShort = new Set(shortlist.map((r) => r.id));
const tier = (r) => inShort.has(r.id) ? 'shortlist' : !r.eligible ? (r.automatic === 'no-automatic-issues' ? 'needs-editing' : 'priority-review') : dupOf.has(r.id) ? 'duplicate' : 'reserve';

const csvCell = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v).replace(/"/g, '""')}"`;
const header = ['id', 'name', 'mealType', 'age', 'minutes', 'ingredients', 'quantified', 'steps', 'servings', 'automatic', 'tier', 'editorialStatus', 'score', 'localMonths', 'photo', 'duplicateOf', 'issues', 'clinicalReviewFlags'];
const csv = [header.join(','), ...rows.map((r) => [r.id, r.name, r.mealType, r.age, r.minutes ?? '', r.ingredients, r.quantified, r.steps, r.servings, r.automatic, tier(r), inShort.has(r.id) ? 'review_required' : 'draft', r.score, r.localMonths, r.photo, dupOf.get(r.id) || '', r.issues, r.risks].map(csvCell).join(','))].join('\n');
fs.writeFileSync(path.join(outDir, 'recipe-inventory.csv'), '﻿' + csv);

const count = (list, key) => list.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] || 0) + 1 }), {});
const summary = {
  generatedAt: new Date().toISOString(), total: rows.length, byMeal: count(rows, 'mealType'), byAutomatic: count(rows, 'automatic'),
  tiers: rows.reduce((m, r) => ({ ...m, [tier(r)]: (m[tier(r)] || 0) + 1 }), {}),
  shortlist: { total: shortlist.length, byMeal: count(shortlist, 'mealType'), byMinimumMonths: count(shortlist, 'minimumMonths'), withClinicalFlags: shortlist.filter((r) => r.risks.length).length, withPhoto: shortlist.filter((r) => r.photo).length },
  duplicatePairs: dupes.length, withPhoto: rows.filter((r) => r.photo).length, over30min: rows.filter((r) => r.minutes > 30).length, unclearTime: rows.filter((r) => r.minutes === null).length,
};
fs.writeFileSync(path.join(outDir, 'recipe-inventory-summary.json'), JSON.stringify(summary, null, 2));
const md = [`# Shortlist editorial — ${shortlist.length} rețete (status: review_required)`, '', 'Selecție euristică din catalogul existent. **Nu este aprobare clinică.** Fiecare rețetă trece prin revizia unui specialist calificat înainte de `clinically_approved`.', '',
  '| # | Rețetă | Masă | Vârstă | Min | Ingr. | Scor | De verificat clinic |', '|---|---|---|---|---|---|---|---|',
  ...shortlist.map((r, i) => `| ${i + 1} | ${r.name} (\`${r.id}\`) | ${r.mealType} | ${r.age} | ${r.minutes} | ${r.ingredients} | ${r.score} | ${r.risks.join(', ') || '—'} |`),
  '', '## Perechi posibil duplicate', '', ...dupes.map(([a, b, why]) => `- \`${a.id}\` ↔ \`${b.id}\` — ${why}; păstrată: \`${dupOf.get(a.id) === b.id ? b.id : a.id}\``)].join('\n');
fs.writeFileSync(path.join(outDir, 'SHORTLIST.md'), md);

const ts = `// Generated by scripts/content-inventory.cjs on ${summary.generatedAt.slice(0, 10)}. Heuristic editorial queue — NOT clinical approval.\nimport type { EditorialStatus } from "../review";\n\nexport const editorialShortlist: { id: string; status: EditorialStatus; score: number }[] = [\n${shortlist.map((r) => `  { id: ${JSON.stringify(r.id)}, status: "review_required", score: ${r.score} },`).join('\n')}\n];\nexport const shortlistIds = new Set(editorialShortlist.map((r) => r.id));\n`;
fs.mkdirSync(path.join(repo, 'src/features/v2/content'), { recursive: true });
fs.writeFileSync(path.join(repo, 'src/features/v2/content/shortlist.ts'), ts);
console.log(JSON.stringify(summary, null, 2));
