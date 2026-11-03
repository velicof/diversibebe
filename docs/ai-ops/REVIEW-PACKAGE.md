# Pachet de revizie pentru medic pediatru / dietetician

## Ce vă rugăm

Revizuirea a **26 de rețete** (lotul 1) care vor fi primele afișate părinților în DiversiBebe 2.0. Fără revizia dumneavoastră semnată, nicio rețetă nu apare în aplicație; o evaluare făcută de un instrument AI nu poate înlocui revizia.

Fișiere:
- `editorial/BATCH-1.md` — lista și acoperirea (mic dejun 7, prânz 9, cină 6, gustări 4; etapele 6+, 8+, 10+, 12+)
- `editorial/batch-1.json` — conținutul complet al fiecărei rețete (ingrediente cu cantități, pași, păstrare, alergeni detectați)
- `editorial/review-sheet-batch-1.csv` — foaia de completat (se deschide în Excel)

Timp estimat: 20–30 de minute pe rețetă (aprox. 10–13 ore pentru lot).

## Pentru fiecare rețetă, verificați

1. **Vârsta minimă** (etapa) este potrivită.
2. **Alergenii** declarați sunt completi (lista din foaie este detectată automat — poate greși în ambele sensuri).
3. **Textura** pentru etapă (coloana „textura_propusa” este o propunere editorială).
4. **Forma de servire** sigură (risc de înecare: fructe mici întregi, nuci, bucăți tari).
5. **Sare, zahăr, miere, lapte de vacă ca băutură**, ingrediente nepasteurizate, ouă insuficient fierte.
6. **Cantitățile** și porția pentru copil; păstrarea și reîncălzirea.
7. Formulări care ar putea fi citite ca sfat medical.

## Decizie (coloana DECIZIE)

| Valoare | Efect |
|---|---|
| `aprobat` | rețeta poate trece în `clinically_approved`, apoi `published` |
| `modificari` | echipa aplică exact corecturile din coloana „corecturi”, apoi vă retrimite rețeta |
| `respins` | rețeta nu se publică |

Completați și: numele, calificarea și numărul de parafă/înregistrare, data, 1–3 surse (link https) pe care vă bazați (ex. ghiduri OMS, ESPGHAN, NHS, SRP).

## Ce se întâmplă cu revizia

Echipa transcrie foaia în `src/features/v2/content/editorial.ts` (revizor, calificare, dată, surse, versiune). Codul refuză publicarea fără aceste câmpuri și respinge orice revizor de tip AI (`hasClinicalReview`, testat). La orice modificare ulterioară a rețetei, versiunea crește și rețeta revine la `review_required`.

## Lacune cunoscute în lot

- Nu există o cină pentru 6+ (la 6 luni majoritatea copiilor au 1–2 mese; propunem să rămână așa — vă rugăm confirmați).
- 2 rețete au cantități incomplete (`cus-cus-legume-12`, `capsuni-banane-iaurt-10`) — de completat la revizie.
- `iaurt-unt-arahide` și `iaurt-unt-migdale` sunt marcate 6+ cu unt de nuci/arahide: vă rugăm confirmați forma (unt fin, cantitate) și mesajul despre introducerea alergenilor.
