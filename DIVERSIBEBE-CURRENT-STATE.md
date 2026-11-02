# DiversiBebe — starea exactă a implementării (2 noiembrie 2026)

Acest document descrie ce există **efectiv** în cod și ce a fost verificat. Modificări de producție, toate aprobate de fondator pe 2 nov. 2026: (1) închiderea P0 `user_login_summary`; (2) **hotfixurile legacy SEO + securitate publicate** prin PR #1 → `main` = `db14a4c`, deployment `dpl_z6E6xAaCN17TEq2goKUmkjJgV9EQ`, verificat live. Codul V2 nu este publicat.

## 1. Versiunea reală și branch-uri

| Element | Valoare verificată |
|---|---|
| Repository V2 (sursa principală) | `E:\App creation\DiversiBebe\Documents\Codex\2026-10-26\files-pasted-by-the-user-misiune\work\diversibebe` |
| Branch de lucru V2 | `codex/diversibebe-real-auth-persistence` (ales de fondator pentru această sesiune) |
| Punct de plecare al sesiunii | `3b73197` (neschimbat față de ultimul raport Codex); working tree curat |
| Checkpoint restaurabil | tag `checkpoint/pre-master-20261101` → `3b73197`; bundle cu toate branch-urile: `outputs/master-2026-11-01/checkpoint/all-branches-20261101.bundle` (verificat cu `git bundle verify`, SHA-256 `daafb8dd…25c9`); backup PostgreSQL local `real-supabase-runtime/private/backups/diversibebe-pre-master-20261101.dump` (`pg_restore -l` OK) |
| Producție (`main`, GitHub) | `db14a4c` = legacy `1bda4b2` + hotfix SEO + hotfix securitate (PR #1, publicat 2 nov. 2026) |
| Hotfix SEO legacy | branch `hotfix/seo-metadata-legacy` = `main` + `ff60cf8` (worktree `work/seo-hotfix-legacy`) |
| Hotfix securitate legacy | branch `hotfix/security-legacy` = `main` + `3fe63c7` |
| Cele două hotfixuri | se combină fără conflicte (`git merge-tree` curat) |

Commituri istorice confirmate în V2: `ab6c12f` (MVP), `373e2a1` (growth/onboarding), `3b73197` (Auth nativ real + persistență).

## 2. Munca din Claude Cloud — NU a putut fi recuperată

Căutat pe discul E:, în Downloads/Desktop/Documents ale utilizatorului și pe GitHub (`git ls-remote`: există doar `main` la `1bda4b2`):

- commiturile `c4845c9`, `56419bf`, `462d5b7` — **inexistente** local și pe remote;
- `claude/fervent-darwin-q5qbrt`, `handoff/*.patch`, `claude-session.bundle` — **negăsite**.

Consecințe și ce s-a refăcut independent, pe V2:
- parolele în localStorage — remedierea existentă (Codex) a fost aplicată pe branch-ul legacy de securitate; nu era nevoie de patch-ul Cloud;
- inventarul celor 291 de rețete — refăcut (cifrele coincid: 74 / 121 / 71 / 25);
- calendarul sezonier, modelul editorial și lista de cumpărături — reconstruite și testate în V2;
- cele **20 de rețete draft** din Cloud — **pierdute**; nu au fost reinventate. Dacă fișierele există pe alt dispozitiv/conversație, se exportă și se compară cu `recipe-inventory.csv` înainte de integrare.

## 3. Inventarul funcționalităților

Legendă: ✅ complet implementat și testat · 🟡 implementat, testat parțial · 🟠 parțial · 🎭 simulat/demonstrativ · ❌ defect · ⛔ inexistent

### V2 (`/v2`, numai preview local; 404 în producție fără flag)

| Funcționalitate | Stare | Dovadă / observații |
|---|---|---|
| Homepage growth (valoare înainte de cont) | ✅ | E2E growth |
| Onboarding 3 întrebări → rezultat | ✅ | E2E growth + native |
| Înregistrare / autentificare (GoTrue real, local) | ✅ | E2E native, test HTTP cu expirare JWT reală |
| Recuperare parolă (PKCE, Mailpit) | ✅ | E2E native |
| Dashboard „Ce gătim azi?” | ✅ | E2E; **nou:** ordonare sezonieră + bandă „proaspăt local” |
| Profiluri copii (mai mulți copii, etapă per copil) | ✅ | E2E native, RLS |
| Biblioteca de rețete / căutare / filtre | 🎭 | funcțional, dar conținut demonstrativ: 0 rețete cu revizie clinică |
| Favorite (familiale) | ✅ | E2E local + cloud |
| Jurnal / confirmarea meselor | ✅ | E2E; confirmare opțională, North Star calculat |
| **Planificator 5 zile** (preferințe, timp, propunere, alternative, înlocuire, salvare) | ✅ **nou** | unit + DB + E2E local și native (2 copii, 2 familii) |
| **Listă de cumpărături** (cumulare sigură, „am acasă”, copiere) | ✅ **nou** | unit + DB + E2E |
| Reutilizarea ingredientelor între zile | ✅ **nou** | unit (reutilizarea nu scade niciodată), afișată în propunere |
| Recomandări personalizate | 🟡 | eligibilitate strictă; mod „live” blocat până la revizie clinică |
| Asistent AI (BebeAsist) | ⛔ (oprit intenționat) | `/api/chat` răspunde 401/503, fără apel plătit |
| Premium | 🎭 | prezentare + măsurare interes, fără checkout |
| Analytics | 🟡 | `product_events` cu allowlist; 2 evenimente noi; fără dashboard |
| Administrarea conținutului | ⛔ | `/admin` → 404; workflow editorial există doar în cod/date |

### Legacy (producție, `main`)

| Funcționalitate | Stare | Observații |
|---|---|---|
| SEO | ✅ publicat 2 nov. 2026 | verify-seo 18/18 pe www; reindexarea Google urmează (Search Console) |
| `/api/chat` | ✅ publicat 2 nov. 2026 | anonim → 401 în producție; limitare per utilizator |
| Parole în localStorage la înregistrare | ✅ publicat 2 nov. 2026 | verificat în producție: parola nu este stocată |
| `/api/data/sync` | 🎭 | stub care răspunde `{ok:true}`; nu scrie nimic |
| Afirmații homepage („Rețete testate și aprobate de nutriționiști”, testimonial) | ⚠️ de verificat | neconcordant cu revizia clinică în așteptare; decizie a fondatorului |

## 4. Securitate

| Problemă | Severitate | Stare la 1–2 nov. 2026 |
|---|---|---|
| `public.user_login_summary` accesibil `anon`/`authenticated` | **P0** | **ÎNCHISĂ în producție pe 2 nov. 2026, ~20:23 UTC**, cu aprobarea fondatorului (migrarea `close_user_login_summary`). Înainte: `anon`/`authenticated` aveau toate privilegiile. După: acces revocat, `security_invoker=true`, REST anonim → 401 `permission denied`, linterul nu mai raportează ERROR. Jurnal: `outputs/master-2026-11-01/security/INTERVENTIE-P0-2026-11-02.md`. |
| `/api/chat` legacy fără autentificare | P1 | patch pregătit (`3fe63c7`), testat local (401 anonim/cookie fals) |
| Parole în localStorage (legacy) | P1 | patch pregătit (`3fe63c7`), testat local (cheia veche ștearsă, parola absentă din stocare) |
| `handle_new_user` — search_path mutabil, executabil de `anon`/`authenticated` | P2 | acoperit de migrarea locală `protect_family_data`; neaplicat în producție |
| Protecția parolelor compromise (HIBP) dezactivată | P2 | setare Auth în dashboard; necesită aprobare |
| RLS / acces între familii și între copii (V2) | — | testat: SQL, HTTP, E2E native |
| Rate limiting | P2 | legacy chat: limitare per instanță (best-effort); V2 chat oprit; lipsește un rate limit partajat |
| Secrete în bundle | — | `service_role` doar în scripturi Node locale; verificare `public-bundle-verification.json` (31 oct.) |

## 5. Conținut

- 291 rețete existente (74 mic dejun, 121 prânz, 71 cină, 25 gustări). 289 fără probleme automate, 2 cu marcaje.
- **Shortlist editorial: 90 rețete** (22/32/24/12; etape 6–12+), status `review_required`. 77 au marcaje de alergeni/sare care cer revizie clinică explicită. **Nicio rețetă nu este aprobată clinic.**
- Probleme de calitate: 76 rețete fără cantități complete, 73 peste 30 min (după corecția timpilor), 2 perechi duplicate, 49 cu cel puțin un ingredient preponderent importat (mai ales avocado, cartof dulce), doar 8 rețete au imagine proprie. Clasificare: 90 shortlist · 116 rezervă · 81 de editat · 2 revizie prioritară · 2 duplicate.
- **Bug corectat în această sesiune:** `parseDuration` citea „1h” ca 1 minut, „2h” ca 2, „1h 30min” ca 30 și „1½ ore” ca 60, deci 4 preparate lungi (supă de pui, mușchi de vită, două tocănițe) treceau de filtrul „max. 30 min” și puteau apărea în „Ce gătim azi?” și în plan. Rețetele „peste noapte” sunt acum excluse din filtrele pentru aceeași zi.
- Catalogul demonstrativ = cele 48 de rețete anterioare + shortlist-ul (129 în total), astfel încât planul de 5 zile se poate completa la orice etapă (la 8 luni: 70 idei eligibile, dintre care 28 prânzuri; înainte erau 3 prânzuri).
- Workflow editorial în cod: `draft → review_required → clinically_approved → published`; ultimele două stări cer revizie documentată (`canTransition`, `isPublishable`).
- Fișiere: `outputs/master-2026-11-01/content/recipe-inventory.csv`, `SHORTLIST.md`, `recipe-inventory-summary.json`; `src/features/v2/content/shortlist.ts`.
- Calendar sezonier: `docs/SEASONAL-CALENDAR.md` (50 produse; orientativ).

## 6. Rezultatele testelor (rularea finală, 2 nov. 2026, build curent)

Jurnale: `outputs/master-2026-11-01/tests/final/` (`SUMMARY.txt`, `build.log`, `unit-sql-http-auth.log`, `e2e.log`, `playwright.json`).

| Verificare | Rezultat |
|---|---|
| Build Next.js (backend nativ local) | PASS |
| TypeScript | PASS |
| Lint V2 + zona de securitate | PASS, 0 probleme |
| Lint întregul repository | 46 erori + 29 avertismente — **identic cu baza moștenită**, toate în fișiere legacy; codul nou nu adaugă niciuna |
| Teste unitare / SQL (PGlite) / HTTP / Auth GoTrue real (inclusiv expirare JWT reală) | **82/82 PASS** (72 inițiale + 10 noi) |
| E2E Playwright pe servicii reale locale | **108/108 PASS**, 0 omise (104 inițiale + 4 noi pentru planificator) |
| Familii cu doi copii / două conturi | PASS (DB + E2E native: planul copilului A nu apare la copilul B sau în alt cont) |
| Persistență după reload și în alt browser | PASS (plan, „am acasă”, bifări) |
| Verificare SEO legacy (`scripts/verify-seo.cjs`) | 18/18 PASS pe build local |
| Securitate legacy: `/api/chat` anonim | 401 înainte de apelul modelului; parola absentă din stocare |
| Secrete în commituri | niciun model de cheie/token/parolă și niciun fișier privat în diferențele sesiunii |
| Capturi reale | 85 PNG în `outputs/master-2026-11-01/captures` (mobil și desktop) |

Rulări intermediare eșuate, păstrate pentru transparență în `outputs/master-2026-11-01/tests/`:
- prima rulare completă: 81/82 unit și 107/108 E2E. Ambele eșecuri aveau aceeași cauză: testele presupuneau că nu există nicio rețetă cu broccoli pentru 6–8 luni; catalogul lărgit o conține (piure de broccoli cu cartof). **Testele au fost modificate, nu eliminate:** testul unitar verifică acum direct regula „ingredientul ales nu e relaxat” și starea goală cu un catalog fără broccoli. Testul E2E verifică respectarea ingredientului ales și păstrarea răspunsurilor. **Pierdere de acoperire:** ecranul „Nu am găsit idei” nu mai poate fi atins din onboarding (orice combinație are acum rezultate), deci este acoperit doar unitar.
- planificatorul E2E a descoperit, înaintea corecției, că propunerea pe 5 zile avea doar 3 prânzuri eligibile la 8 luni; de aici lărgirea catalogului demonstrativ.

Probleme moștenite (nu regresii): lint legacy de mai sus; avertismentul Next „middleware → proxy” pe branch-ul legacy.

## 8. Rezumatul modificărilor din această sesiune

| Commit | Branch | Conținut |
|---|---|---|
| `ff60cf8` | `hotfix/seo-metadata-legacy` | SEO producție: titlu, descriere, `lang="ro"`, favicon, OG, robots, sitemap, noindex privat, JSON-LD |
| `3fe63c7` | `hotfix/security-legacy` | chat autentificat + limitare; fără parole în localStorage |
| `aa9096c` | V2 | shortlist editorial, sezonalitate, corecția timpilor |
| `3110dc5` | V2 | planificator 5 zile, listă de cumpărături, evenimente noi |
| `c9efb64` | V2 | merge hotfix SEO în V2 |

## 7. Cum pornești preview-ul local

```powershell
node scripts/native-runtime.cjs
node scripts/native-command.cjs build
node scripts/native-command.cjs preview
```

Apoi: http://127.0.0.1:3100/v2 · planificator: http://127.0.0.1:3100/v2/plan · cont fondator: `founder@example.test` (date în `real-supabase-runtime/private/founder-access.txt`, nu se publică).

Hotfix SEO legacy (verificare): în `work/seo-hotfix-legacy`, `npm run build` cu variabile de mediu locale placeholder, `next start -p 3200`, apoi `node scripts/verify-seo.cjs http://127.0.0.1:3200`.
