# DiversiBebe — backlog prioritar și criterii de acceptare

Ordinea respectă regula: securitate → SEO → consolidare → conținut → experiență premium → pilot. Fiecare element are un criteriu verificabil.

## Decizii care necesită aprobarea fondatorului

| # | Acțiune | Efect în producție | Pregătit |
|---|---|---|---|
| A1 | **Închiderea `user_login_summary`** (P0) | revocă accesul `anon`/`authenticated`, `security_invoker=true` | `outputs/master-2026-11-01/security/00…02-*.sql` |
| A2 | Deploy hotfix securitate legacy (chat cu autentificare, fără parole în localStorage) | schimbă comportamentul BebeAsist pentru vizitatori | branch `hotfix/security-legacy` (`3fe63c7`) |
| A3 | Deploy hotfix SEO legacy | titlu, descriere, favicon, sitemap, robots în Google | branch `hotfix/seo-metadata-legacy` (`ff60cf8`) |
| A4 | Domeniu canonic: păstrăm `www.diversibebe.com` și schimbăm redirect-ul apex 307 → 308 în Vercel | setare de domeniu Vercel | recomandare |
| A5 | Activarea protecției parolelor compromise (Supabase Auth) | setare Auth | recomandare |
| A6 | Afirmațiile de pe homepage-ul legacy („aprobate de nutriționiști”, testimonialul) — se confirmă cu dovezi sau se elimină | conținut public | de decis |
| A7 | Push pe GitHub al branch-urilor locale | publicare cod | nu s-a făcut |
| A8 | Contractarea unui specialist pentru revizia clinică a shortlist-ului | cost | shortlist 90 rețete |
| A9 | Buget pentru fotografii (lot-pilot 12) | cost | `docs/PHOTO-STRATEGY.md` |
| A10 | Contactarea părinților pentru pilot | comunicare externă | `real-app-2026-10-30/PLAN-PILOT.md` |

## P0 — Securitate (blochează pilotul)

1. **Aplicarea A1 după aprobare.**
   - Acceptare: preflight arată proprietarul și granturile; după patch `has_table_privilege('anon'|'authenticated', …, 'SELECT') = false`, `reloptions = {security_invoker=true}`; linterul Supabase nu mai raportează `security_definer_view`; nicio eroare nouă în logurile aplicației timp de 24 h.
2. Backup înainte de aplicare și jurnal al intervenției (cine, când, rezultat).

## P1 — SEO și hotfixuri legacy

1. Deploy A3 apoi A2 (sau împreună — se combină fără conflicte).
   - Acceptare SEO: `node scripts/verify-seo.cjs https://www.diversibebe.com` → toate verificările PASS; `curl /robots.txt` și `/sitemap.xml` → 200; Google Search Console: sitemap trimis, cerere de reindexare a homepage-ului.
   - Distincție obligatorie în raportare: *corectat local* (acum) → *publicat* (după deploy) → *reindexat* (după ce Google afișează noul titlu; zile–săptămâni).
   - Acceptare securitate: `POST /api/chat` fără sesiune → 401; după înregistrare, `localStorage` nu conține parole.
2. A4: redirect permanent apex → www.

## P2 — Consolidare cod

1. **Bug timp de preparare** (găsit în această sesiune): `parseDuration` interpreta „1h” ca 1 minut — corectat în V2; de verificat și în legacy (`retete` filtrate după timp).
2. ~~Unificarea hotfixului SEO în V2~~ — făcut (`c9efb64`). Rămâne: `hotfix/security-legacy` în V2 numai pentru partea de înregistrare legacy (V2 are deja chat-ul oprit și curățarea parolelor).
3. Staging complet Supabase (Storage, Realtime, confirmare email reală) pentru migrațiile V2 + compatibilitate legacy.
   - Acceptare: toate migrațiile aplicate pe o copie a producției fără erori; testele HTTP/E2E rulate pe staging.
4. Rate limiting partajat (tabel de cote în PostgreSQL sau Vercel KV) pentru orice endpoint care costă bani.
5. Lint-ul întregului repository: 46 erori + 29 avertismente moștenite (legacy) — de redus fără a atinge comportamentul.

## P3 — Conținut

1. Revizia clinică a shortlist-ului de 90 de rețete (A8). Prioritate: cele 77 cu alergeni/sare.
   - Acceptare: fiecare rețetă are `reviewer`, `credentials`, `reviewedAt`, surse `https://`, versiune; trece în `clinically_approved` numai prin `canTransition`.
2. Completarea cantităților pentru 76 de rețete și a porțiilor; eliminarea celor 2 duplicate.
3. Forme de servire sigure explicite (ex. afine strivite sub 12 luni, nuci doar măcinate/unt fin).
4. Recuperarea celor 20 de rețete draft din Cloud, dacă fișierele există; altfel nu se recreează automat.
5. Validarea calendarului sezonier de către cineva cu experiență în piețele românești.

## P4 — Experiență premium

1. Lot-pilot de 12 fotografii (A9) conform `docs/PHOTO-STRATEGY.md`; apoi integrare în carduri (`catalog.ts → image`).
   - Acceptare: fiecare fotografie aprobată vizual de fondator, fără forme de servire nesigure, ≤150 KB WebP, `alt` descriptiv.
2. Planificator: mai multe mese pe zi (necesită schema `meal_plans` cu `slot` + tip de masă), planuri salvate/reutilizabile, export PDF.
3. Lista de cumpărături: grupare pe raioane, partajare.
4. Prezentarea Premium după valoare: cardul de după salvarea planului există; de testat A/B cu pagina Plus.

## P5 — Calitate și pilot

1. Pilot 20–30 de părinți după P0 și revizia clinică a rețetelor folosite (A10).
   - Praguri (din 30): 18 rezultat util fără ajutor · 12 folosesc sugestii ≥3 zile în săptămâna 2 · 9 revin în săptămâna 4 · 6 disponibilitate explicită de plată.
2. Dashboard intern read-only pentru metricile din `docs/V2-ANALYTICS.md` (exclude `is_test`).
3. Teste pe dispozitive reale (iOS Safari, Android Chrome), VoiceOver/TalkBack.
4. **GO/NO-GO:** GO numai dacă P0 închis, P1 publicat, rețetele din pilot aprobate clinic, toate testele verzi pe staging.

## Roadmap lansare și monetizare

| Etapă | Durată orientativă | Obiectiv | Criteriu de trecere |
|---|---|---|---|
| 0. Igienă | 1 săptămână | P0 + P1 publicate | verificări securitate/SEO PASS în producție |
| 1. Conținut de încredere | 2–4 săptămâni | 40–60 rețete aprobate clinic + 12 fotografii | revizie documentată |
| 2. Pilot închis | 4 săptămâni | 20–30 familii, gratuit | pragurile de mai sus |
| 3. Test de preț | 2–4 săptămâni | interes Premium la 19–29 lei/lună vs pachet 49–79 lei | ≥6/30 disponibilitate explicită, fără reduceri fictive |
| 4. Checkout | după decizie | plăți reale | aprobare separată, termeni, facturare |

Gratuit rămân: rețete de bază, căutare, siguranță esențială, ideea zilei, salvări de bază. Premium de testat: planificare 5–7 zile, listă de cumpărături, personalizare avansată, planuri salvate, mesele familiei. Fără presiune comercială artificială, fără testimoniale inventate.
