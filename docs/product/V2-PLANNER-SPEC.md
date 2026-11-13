# Specificație: planificator flexibil (Varianta B extinsă)

*13 nov. 2026 · status: **propunere, neaprobată**. Nimic din schema de producție nu se schimbă
înainte de aprobare.*

## 1. Ce vrea părintele

> „Aleg pentru câte zile și ce mese vreau planificate. Primesc rețete potrivite vârstei și
> alergiilor, fără repetiții inutile, pot schimba orice, iar lista de cumpărături se refă singură.”

Cerințe confirmate de fondator:
- mese selectabile: **mic dejun, prânz, cină, gustare (opțională)**;
- număr și tip de mese configurabile, cu valori inițiale orientative pe etapă; o zi poate avea
  o singură masă sau mai multe; **nu impunem trei mese tuturor**;
- orizont **1, 3, 5 sau 7 zile**;
- respectă alergiile și ingredientele neverificate (filtrul existent din `src/features/v2/allergy.ts`);
- evită repetițiile; înlocuire individuală; modificare manuală;
- lista de cumpărături se actualizează la orice schimbare;
- planurile existente V1/V2 se păstrează fără pierderi.

## 2. Situația de azi (audit)

| Strat | Azi | Limita |
|---|---|---|
| Tabel `meal_plans` (producție) | `id, user_id, baby_id, planned_for, recipe_id, created_at, updated_at`; `UNIQUE(user_id, baby_id, planned_for)` | **O singură rețetă pe copil pe zi** |
| Date existente | **1 rând** în producție (o familie, în trecut) | Migrarea datelor e trivială |
| RLS | `v2_plan_owner` (FOR ALL): proprietar + copil ≥ 6 luni | Nu depinde de numărul de mese; rămâne valabilă |
| RPC `v2_apply_action` | `plan` = `INSERT … ON CONFLICT (user_id,baby_id,planned_for) DO UPDATE`; `remove-plan` șterge ziua | Cheia conflictului include doar ziua |
| RPC `v2_load_state` | `plan: [{slot, recipeId}]` | Fără tipul mesei |
| Client `plan-many` | O buclă de apeluri `plan` separate (`repository.ts`) | **Nu e atomic**: o eroare la mijloc lasă un plan parțial |
| Model client | `PlanEntry = { slot: "AAAA-LL-ZZ", recipeId }`, cheia = ziua | Toate funcțiile din `planning.ts` presupun o masă/zi |
| Vizitator (fără cont) | Același model, în `localStorage` (`previewStore`) | Idem |
| V1 `/plan` | Plan calculat pe dispozitiv: 1 masă (< 7 luni), 2 (7 luni), 3 (8+ luni); înlocuirile manuale în `localStorage` (`plan_overrides_<săpt>_<zi>_<masă>`) | Nu e în baza de date; V2 nu îl poate citi de pe alt dispozitiv |

## 3. Modelul de date propus

### 3.1 `meal_plans`
```sql
ALTER TABLE public.meal_plans
  ADD COLUMN meal text NOT NULL DEFAULT 'oricare'
  CHECK (meal IN ('mic-dejun','pranz','cina','gustare','oricare'));
-- Unicitatea trece de la „o rețetă pe zi” la „o rețetă pe masă”:
ALTER TABLE public.meal_plans DROP CONSTRAINT meal_plans_user_id_baby_id_planned_for_key;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_child_day_meal_key
  UNIQUE (user_id, baby_id, planned_for, meal);
```
- `oricare` = rândurile vechi (o masă pe zi, fără tip). Rândul existent primește automat
  `oricare`; **nimic nu se pierde și nimic nu se rescrie**. În interfață apare ca „Masă” și
  poate fi mutat de părinte pe un tip anume.
- Limita naturală: maximum 5 rânduri/copil/zi (unicitate + 5 valori permise).
- RLS: `v2_plan_owner` rămâne neschimbată (proprietar + etapă ≥ 6 luni).
- Indexul unic acoperă și citirea pe interval (`user_id, baby_id, planned_for`).

### 3.2 Setările planificatorului, per copil
```sql
ALTER TABLE public.user_preferences
  ADD COLUMN planner jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (octet_length(planner::text) <= 4096);
-- forma: {"<baby_id>": {"meals": ["mic-dejun","pranz"], "days": 5}}
```
Valorile inițiale se calculează din etapă dacă lipsesc (secțiunea 5). Validare în RPC:
doar copiii proprii, doar valorile permise, `days ∈ {1,3,5,7}`.

### 3.3 RPC
| Acțiune | Payload | Comportament |
|---|---|---|
| `plan` | `{slot, meal?, recipeId}` | `meal` lipsă → `oricare` (compatibil cu build-ul vechi). `ON CONFLICT (user_id,baby_id,planned_for,meal) DO UPDATE` |
| `remove-plan` | `{slot, meal?}` | Șterge exact masa; `meal` lipsă → `oricare` |
| `plan-many` (**nou, atomic**) | `{entries:[{slot,meal,recipeId}], replace?:{from,to,meals}}` | O singură tranzacție. Max. 35 de rânduri (7 zile × 5). Opțional șterge întâi mesele din interval pentru tipurile alese (regenerare). Validări: copil propriu, etapă ≥ 6, id-uri valide, zile în [azi, azi+13] |
| `planner-settings` (**nou**) | `{meals, days}` | Scrie `user_preferences.planner[baby_id]` |
| `v2_load_state` | — | `plan: [{slot, meal, recipeId}]`, ordonat pe zi și ordinea mesei; `planner` pentru copilul selectat |

Restricția de alergii rămâne pe client (serverul nu cunoaște ingredientele), cu blocarea din
`dispatch` pentru rețetele care conțin un alergen înregistrat.

### 3.4 Ordinea de lansare (fără întrerupere)
1. Migrația (aditivă): build-ul vechi continuă să funcționeze (trimite fără `meal` → `oricare`).
2. Build-ul nou de client.
3. **Rollback:** se revine doar la clientul vechi; coloana și noua unicitate rămân (sunt
   compatibile). Revenirea la unicitatea pe zi ar cere ștergerea meselor în plus → nu se face
   automat.

## 4. Modelul în aplicație

```ts
type MealSlot = "mic-dejun" | "pranz" | "cina" | "gustare" | "oricare";
type PlanEntry = { slot: string /* AAAA-LL-ZZ */; meal: MealSlot; recipeId: string };
// cheia unei mese: `${slot}|${meal}`
```
- `Action`: `plan {slot, meal, recipeId}`, `remove-plan {slot, meal}`, `plan-many {entries, replace?}`,
  `planner-settings {meals, days}`.
- **Vizitator:** `readState` acceptă intrări fără `meal` și le citește ca `oricare` (planurile
  existente din browser rămân); deduplicare pe cheie.
- **Import vizitator → cont** (`guest-import.ts`): cheia devine `(zi, masă)`; o masă ocupată în
  cont rămâne a contului; filtrul de etapă + alergii rămâne neschimbat.
- **V1:** planul V1 nu e în baza de date, deci nu există date de migrat. Valorile inițiale ale
  meselor în V2 urmează aceeași convenție ca V1 (1/2/3 mese după vârstă), ca familia să regăsească
  același ritm. Opțional (P2): un buton „Preia planul din V1 de pe acest dispozitiv” care citește
  `plan_overrides_*` din `localStorage`.

## 5. Valori inițiale (orientative, editabile)

| Etapă | Mese preselectate | Gustare |
|---|---|---|
| 6 luni | prânz | oprită |
| 7 luni | mic dejun, prânz | oprită |
| 8–9 luni | mic dejun, prânz, cină | oprită |
| 10+ luni | mic dejun, prânz, cină | propusă, debifată |

Textul de lângă: *„Un punct de pornire, nu o recomandare medicală. Alege mesele pe care le
gătești tu.”* Convenția e cea folosită deja în V1; nu are revizie de specialitate.

## 6. Algoritmul de propunere

Intrare: rețete eligibile **strict** (etapă, timp, alergii — doar „compatibile”), zilele
alese × mesele alese, preferințe (ingrediente, refolosire), mesele deja păstrate.

1. Pentru fiecare tip de masă, un **pool separat** (`recipe.mealType`); `oricare` = toate tipurile.
2. Ordinea de completare: zi cu zi, masă cu masă; mesele păstrate („deja în plan”) nu se ating.
3. **Fără repetiții:** o rețetă apare o singură dată în tot planul; dacă pool-ul unui tip e mai
   mic decât numărul de zile, se permite reutilizarea doar după ce s-au epuizat toate celelalte
   variante, la distanță de minimum 2 zile, marcată „se repetă”.
4. **Varietate în aceeași zi:** penalizare dacă două mese din aceeași zi au același ingredient
   principal.
5. **Refolosirea ingredientelor între zile** (opțiune existentă) rămâne, cu limită de 3 apariții.
6. Câte 2 alternative per masă, din rețete nefolosite.
7. **Plan parțial:** dacă un tip de masă nu are destule rețete, se completează ce se poate și se
   explică **pe tip de masă** („Pentru cină: 2 rețete potrivite; 9 conțin un alergen înregistrat,
   4 au ingrediente neverificate”). Nu se adaugă rețete incompatibile ca să umple golurile.

Complexitate: ≤ 35 de sloturi × ≤ 300 de rețete → instant pe telefon.

## 7. Interfața propusă

### 7.1 Construire (un singur ecran, fără pași)
```
Pentru: [Eduard ▾]
Câte zile?   [1] [3] [5•] [7]
Ce mese?     [✓ Mic dejun] [✓ Prânz] [✓ Cină] [ Gustare]
Timp:        [15] [20] [30•] min
Ingrediente pe care le ai (opțional): …
[ Fă planul ]                       ← un singur buton
```
Alegerile se rețin per copil (`planner-settings`).

### 7.2 Propunere și plan
```
Azi · joi 14
  Mic dejun   Terci de ovăz cu pară     [↻] [⋯]
  Prânz       Supă cremă de dovlecel    [↻] [⋯]
  Cină        — nicio rețetă potrivită (vezi de ce)  [+ Alege]
Vineri 15 …
[ Salvează planul ]   Lista de cumpărături (12) →
```
- `↻` = următoarea alternativă, instant; `⋯` = Alege altă rețetă / Elimină / Mută la altă masă.
- Fiecare rând are marcajul de alergii existent dacă e cazul.
- După salvare: banner cu lista de cumpărături (ca acum) și numărul de mese.

### 7.3 Azi
Lista meselor de azi, fiecare cu „Am pregătit” (confirmarea existentă, per rețetă) și, P1,
„A încercat: [aliment]” pentru alimentele noi din rețetă.

### 7.4 Lista de cumpărături
Neschimbată ca logică (`buildShoppingList` pe toate intrările din interval); se recalculează la
orice schimbare. Grupare pe zile disponibilă ca opțiune P1.

## 8. Scenarii de test

**Unitare (`planning`, `guest-import`, model):**
1. 5 zile × {prânz}: 5 rețete distincte, toate de tip prânz.
2. 7 zile × {mic dejun, prânz, cină, gustare}: ≤ 28 sloturi, nicio rețetă repetată cât timp
   pool-ul ajunge.
3. Pool mic pentru cină (2 rețete) pe 5 zile: 2 cine + explicație pe tip; zero rețete incompatibile.
4. Alergie (ou + lapte): nicio intrare cu status ≠ compatibil.
5. Înlocuire individuală: celelalte sloturi rămân identice.
6. Mese păstrate („deja în plan”): neatinse la regenerare.
7. `readState` cu plan vechi `{slot, recipeId}` → `meal: "oricare"`, nimic pierdut.
8. Import vizitator: aceeași zi, mese diferite → ambele intră; aceeași masă ocupată în cont → rămâne a contului.
9. Lista de cumpărături: eliminarea unei mese scoate doar ingredientele ei.

**Baza de date (PGlite + PostgreSQL local):**
10. Rândul vechi primește `oricare`; numărul de rânduri neschimbat.
11. Două mese în aceeași zi → 2 rânduri; aceeași masă de două ori → actualizare, nu duplicat.
12. Client vechi (fără `meal`) → `oricare`; tot funcționează.
13. `plan-many` atomic: o intrare invalidă → nimic salvat.
14. RLS: altă familie / copil străin / etapă < 6 → refuz.
15. Limite: > 35 de intrări, zile în afara intervalului, `meal` invalid → refuz.

**E2E (Chromium + WebKit, 390×844):**
16. Copil 6 luni: implicit doar prânz; plan pe 3 zile.
17. Copil 12 luni + alergie: 5 zile × 3 mese salvate; deconectare/reconectare → identic.
18. Înlocuire și eliminare individuală; lista de cumpărături se schimbă corespunzător.
19. Vizitator cu plan vechi în browser → apare ca „Masă”; după conectare se importă.
20. Doi copii cu setări diferite de mese.

## 9. Efort estimat

| Bucată | Zile de lucru |
|---|---|
| Migrație + RPC (`plan`, `remove-plan`, `plan-many` atomic, `planner-settings`, `load_state`) + teste DB | 1,5 |
| Model client, store local/cloud, import vizitator | 1,5 |
| Algoritm de propunere + teste unitare | 1 |
| Interfață (construire, propunere, plan, Azi) | 2 |
| E2E Chromium/WebKit + reglaje pe iPhone | 1 |
| **Total** | **≈ 7 zile** |

## 10. Decizii cerute fondatorului

1. Aprobarea modelului (`meal` + unicitate pe masă + `planner` în preferințe).
2. Orizontul maxim: 7 zile (propus) sau 14.
3. Tabelul de valori inițiale (secțiunea 5).
4. Dacă importul planului V1 de pe dispozitiv intră în P2 sau se renunță la el.
