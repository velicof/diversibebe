# Planificator flexibil — runbook de migrare

*13 nov. 2026 · implementat și testat **local**. Nicio schimbare în Supabase producție și niciun
deploy fără aprobarea separată a fondatorului pentru fiecare pas marcat ☁.*

## Ce se schimbă
`supabase/migrations/20261113100000_v2_flexible_planner.sql` (în `supabase/v2-release.cjs`):

| Obiect | Schimbare | Compatibil cu build-ul de pe Preview? |
|---|---|---|
| `meal_plans.meal` | coloană nouă, `NOT NULL DEFAULT 'oricare'`, valori permise: mic-dejun, pranz, cina, gustare, oricare | Da: rândurile vechi devin `oricare` |
| Unicitate `meal_plans` | din (copil, zi) în (copil, zi, masă) | Da: clientul vechi scrie mereu `oricare` |
| `user_preferences.planner` | jsonb, ≤ 4 KB, alegerile per copil | Da (ignorat de clientul vechi) |
| `product_events` | 3 evenimente noi (`plan_generated`, `plan_saved`, `plan_meal_replaced`), proprietăți numerice noi `days`, `meals` | Da (superset) |
| `v2_load_state` | întoarce `meal` per masă și `planner` | Da: câmpuri în plus |
| `v2_apply_action` | `plan`/`remove-plan` cu `meal` opțional; `plan-many` **atomic** (max. 35); `planner-settings` | Da: fără `meal` → `oricare` |
| RLS `v2_plan_owner` | **neschimbată** (proprietar + etapă ≥ 6 luni) | — |
| V1 | nu citește și nu scrie `meal_plans` / `user_preferences` | V1 neatins |

Date în producție la 13 nov.: `meal_plans` = 1 rând (citire agregată, fără conținut).

## Verificat local
- PGlite (`tests/planner-flex-db.test.cjs`, 7 teste): upgrade cu rând existent → `oricare`, nimic pierdut;
  mai multe mese/zi; client vechi; `plan-many` atomic (o intrare invalidă → nimic salvat); limite
  (36 de intrări, masă invalidă, zi în afara intervalului); RLS (altă familie, copil străin, etapa 0,
  anonim); setări per copil validate; evenimente doar numerice; rollback refuzat cât timp o zi are mai
  multe mese, reușit altfel.
- PostgreSQL 17 nativ (GoTrue + PostgREST reale): migrația aplicată, postflight = toate `true`,
  623 de rânduri de test convertite în `oricare` fără pierderi.
- `tests/migration-rehearsal.test.cjs`: date V1 în forma producției trec prin toată lansarea.

## Pașii pentru producție (fiecare ☁ cere aprobare separată)

1. **☁ Backup** — fondatorul rulează în terminalul lui `node scripts/prod-backup.cjs`
   (parola bazei nu ajunge la agent), apoi `--verify … --restore-local`. Verificarea numărului de
   rânduri include acum `meal_plans`, `user_preferences`, `product_events`.
2. **☁ Preflight (doar citire)** — `supabase/operations/v2-planner-preflight.sql`. Toate `ok` = true;
   se notează numerele.
3. **☁ Migrația** — `20261113100000_v2_flexible_planner.sql` (o singură tranzacție).
4. **☁ Postflight (doar citire)** — `supabase/operations/v2-planner-postflight.sql`. Toate `ok` = true;
   numerele egale cu cele din preflight.
5. **☁ Push `release/v2-rc` → build Preview** — abia după pasul 4 (clientul nou cere `plan-many`).
6. Retest pe iPhone (lista de mai jos).

Ordinea 3 → 5 contează: migrația merge cu clientul vechi, dar clientul nou nu merge fără migrație.

## Rollback
- **Preferat:** revenire doar la clientul anterior (redeploy). Funcțiile noi acceptă apelurile
  clientului vechi; nu se atinge baza.
- **Structural** (`supabase/operations/v2-planner-rollback.sql`): readuce unicitatea pe zi și funcțiile
  anterioare. **Refuză și nu schimbă nimic** cât timp un copil are mai multe mese în aceeași zi —
  restaurarea regulii veche ar cere ștergerea de rânduri, ceea ce nu se face tacit. Singura informație
  pierdută la un rollback structural: tipul mesei pentru zilele cu o singură masă.

## Retest pe iPhone (după pașii 1–5)
1. Plan: alegi 3 zile × Mic dejun + Prânz + Cină → „Arată planul” → 9 mese, toate fără marcaj de alergen.
2. „Altă rețetă” pe o masă, „Scoate” pe alta → „Salvează planul”.
3. În plan: înlocuiește o masă (↻) și elimină una (×); lista „De cumpărat” se schimbă.
4. Azi: „Mesele de azi” cu „Am pregătit”.
5. Deconectare/reconectare: planul și alegerile (zile, mese) rămân.
6. Eduard: valorile inițiale ale meselor corespund etapei; schimbă-le și verifică că sunt reținute.

## GO / NO-GO (14 nov. 2026)

| Criteriu | Rezultat |
|---|---|
| Branch | 3 commituri peste Preview (`1c46088`), doar V2, teste, documentație, `supabase/`, `scripts/prod-backup.cjs`; **niciun fișier V1** |
| Teste unitare + DB (PGlite) | 160/160 |
| E2E Chromium (toată suita) | 146 trec, 3 omise (aceleași ca înainte) |
| E2E WebKit (toată suita) | 144 trec, 3 omise; 2 eșecuri analizate: (a) test cu reîncărcare imediat după schimbarea copilului — corectat, apoi 4/4 pe ambele motoare; (b) eșec cunoscut de motor: navigarea cu Tab pe linkuri (Safari nu o face implicit), test neatins |
| V1 | niciun fișier V1 schimbat; codul V1 nu folosește `meal_plans`, `user_preferences`, `product_events` sau funcțiile V2 |
| Clientul de pe Preview (`1c46088`) pe baza migrată (local) | 31/32 din propriile teste de cont; singurul eșec e limita de tranziție știută: clientul vechi nu poate elimina mesele cu tip create de clientul nou (nu le strică, nu le șterge) |
| Preflight producție (read-only) | 7/7 `true`; `meal_plans` 1, `user_preferences` 1, `product_events` 19, `allergy_records` 27, `tried_foods` 4.704 |
| Backup nou cu restaurare de test + copie externă | **în așteptare (fondator)** |

**Decizie: GO tehnic pentru migrație, condiționat de backupul verificat și de aprobarea explicită a fondatorului.**
