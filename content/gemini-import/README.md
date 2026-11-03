# Import imagini Gemini — zonă de carantină

Aici ajung imaginile descărcate din Gemini Images. **Nimic din acest folder nu este servit de aplicație.**
Imaginile publicate există numai în `public/v2/recipes/` și numai după aprobare umană.

| Folder | Conținut | În git? |
|---|---|---|
| `incoming/` | fișierele descărcate, redenumite exact ca `fileName` din `docs/ai-ops/photos/manifest.json` | nu (ignorat) |
| `review/` | previzualizări 800×600 generate de `check` | nu (ignorat) |
| `rejected/` | imagini respinse, păstrate pentru istoric | nu (ignorat) |
| `REPORT.md` | raportul tehnic generat de `check` | da |

Pași:
1. Descarcă imaginile din Gemini în `incoming/` (ex. `piure-broccoli-cartof-6.png`).
2. `node scripts/photo-import.cjs check` → citește `REPORT.md` și previzualizările din `review/`.
3. Verificare vizuală cu checklist-ul din `docs/ai-ops/GEMINI-HANDOFF.md`. Respinsă → mută în `rejected/`, notează `rejectionReason` în manifest.
4. Aprobată → în manifest: `imageStatus: "approved"`, `alt`, `provenance` (generator, model, data, `termsUrl`, `commercialUseTermsChecked: true`, `reviewedBy`).
5. `node scripts/photo-import.cjs publish <recipeId>` → WebP 480/800/1200 în `public/v2/recipes/`, intrare în `src/features/v2/content/photos.ts`.
6. Online, fotografia apare numai când rețeta are status editorial `published` (revizie clinică semnată).
