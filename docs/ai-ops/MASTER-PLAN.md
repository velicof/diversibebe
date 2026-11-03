# MASTER PLAN — DiversiBebe 2.0

Punct de intrare pentru orice agent (Claude, Codex, ChatGPT, Gemini) care continuă lucrul. **Nu reluați auditul:** faptele de mai jos sunt verificate și datate; reverificați doar ce schimbați.

## Roluri

| Cine | Responsabil pentru |
|---|---|
| Fondatorul | aprobări pentru producție, costuri, comunicare cu utilizatori și specialiști, test pe telefon |
| ChatGPT | strategia produsului și criteriile de lansare |
| Claude (Principal Engineer) | implementare, arhitectură, teste, livrabile |
| Gemini 4 Argon | evaluare UX independentă (recomandări, nu adevăr automat) |
| Gemini Images | fotografii pentru cele 12 rețete pilot |
| Pediatru/dietetician | singura sursă a aprobării clinice |

## Unde suntem (3 nov. 2026)

- Repository: `E:\…\work\diversibebe`, branch **`release/v2-rc`** (checkpoint anterior: tag `checkpoint/pre-release-arch-20261103` → `f68df7a`).
- Producție: V1 cu hotfixurile SEO + securitate (`main` = `db14a4c`); P0 `user_login_summary` închis și **reconfirmat** prin metadate.
- V2: complet local (Auth real, RLS, planificator, listă de cumpărături, sezonalitate); **nepublicat**.
- Branch legacy local `hotfix/v1-v2-schema-compat` (`b12b652`, în worktree-ul `work/seo-hotfix-legacy`): patch V1 obligatoriu înaintea migrațiilor V2.
- Decizia de lansare curentă: `RELEASE-READINESS.md`.

## Documente

| Fișier | Conținut |
|---|---|
| `PRD.md` | produsul de lansare, inclus/amânat, etape, stări de eroare, Free/Premium, criterii |
| `LIBRARY-REPORT.md` + `editorial/CORRECTIONS-LOG.md` | **biblioteca completă (291)**: cifre, excepții, jurnalul fiecărei corecturi; regenerat de `scripts/library-report.cjs` |
| `photos/PHOTO-REPORT.md` + `photos/catalog-manifest.json` | fotografii pentru toate rețetele: identitate, loturi, prompturi Gemini |
| `MIGRATION-V1-V2.md` | **un singur proiect Supabase**: ce știm despre producție, repetiția migrării, lansare graduală, canary, rollback |
| `ARCHITECTURE.md` | producție, compatibilitate V1/V2, migrații, beta, auth, costuri (§4 staging: istoric) |
| `DESIGN-SYSTEM.md` | tokeni, reguli, ecrane, corecturi din capturi |
| `QUALITY-GATES.md` | G1–G13, comenzi de verificare |
| `GEMINI-HANDOFF.md` | ce primește Argon / Images și cum se integrează răspunsurile |
| `REVIEW-PACKAGE.md` + `editorial/` | lotul 1 (26 rețete) pentru specialist, foaia de revizie |
| `photos/manifest.json` | specificațiile celor 12 fotografii |
| `BACKLOG.md` | pași prioritizați, efort, cost, aprobări |
| `RELEASE-READINESS.md` | GO/NO-GO cu dovezi |

## Mecanisme în cod (nu le ocoliți)

| Mecanism | Unde | Test |
|---|---|---|
| Biblioteca: 291 rețete → corecturi → alergeni UE → reguli de siguranță → status → publicare (≠ aviz medical) | `src/features/v2/catalog.ts`, `content/safety.ts`, `content/corrections.ts` | `tests/library.test.cjs`, `tests/editorial-gate.test.cjs`, `tests/e2e/library.spec.cjs` |
| Consola de revizie (toate statusurile, cod separat, export CSV) | `src/features/v2/review/ReviewConsole.tsx`, `/v2/revizie`, `/acces-revizie` | `tests/e2e/library.spec.cjs` |
| Revizie umană obligatorie, AI respins, revizie legată de conținut | `review.ts` (`hasClinicalReview`), `content/editorial.ts` (`recipeFingerprint`) | idem |
| Lista unică a migrațiilor de lansare | `supabase/v2-release.cjs` | toate testele DB |
| Compatibilitate V1 ↔ V2 | `tests/v1-compat.test.cjs`, migrarea `v2_legacy_history` | idem |
| Schema de test = producția (8 categorii) | `tests/fixtures/production-metadata.json` | `tests/schema-drift.test.cjs` |
| Repetiția migrării (date sintetice cu forma producției) | `tests/fixtures/synthetic-production.cjs`, `scripts/migration-rehearsal.cjs` | `tests/migration-rehearsal.test.cjs` |
| Preflight / postflight / rollback L1 | `supabase/operations/v2-{preflight,postflight,disable}.sql` | idem |
| Backup criptat + verificare prin restaurare | `scripts/prod-backup.cjs` | rulat local pe date sintetice |
| V2 pe proiectul V1, texte pentru conturi reale, Google | `src/features/v2/cloud/guard.ts`, `content/copy.ts` (`accountCopy`) | `tests/release-gates.test.cjs` |
| Robots: V1 rămâne indexabil cu V2 activ | `src/app/robots.ts` | idem |
| Beta cu invitație, fail-closed în producție | `src/lib/security/invite.ts` (`v2AccessAllowed`), `src/proxy.ts`, `/acces-beta` | `tests/invite.test.cjs`, `release-gates` |
| Import fotografii în carantină | `scripts/photo-import.cjs`, `content/gemini-import/` | refuz fără aprobare (verificat manual) |
| Generare lot editorial + manifest | `scripts/editorial-batch.cjs` | determinist; păstrează deciziile umane |

## Reguli permanente

1. Fără modificări în producție, push, merge, deploy, costuri sau contact cu utilizatori fără aprobare distinctă a fondatorului, pentru fiecare acțiune.
2. Nicio rețetă nu devine `clinically_approved`/`published` fără revizie umană semnată.
3. Fără date reale de copii sau secrete în materialele pentru Gemini sau în capturi.
4. Nu ștergeți teste pentru a obține verde; o pierdere de acoperire se documentează.
5. Rezultatele de test se citează cu fișierul de log din `outputs/<data>/tests/`.

## Următorul pas

Primul element din `BACKLOG.md` → P0 care nu a fost încă aprobat.
