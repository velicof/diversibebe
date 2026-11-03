# Design system V2 (identitatea existentă, codificată)

Sursa: `src/app/v2/v2.css`, `growth.css`, `src/features/v2/components.tsx`. Nu se redesenează ecranele bune; documentul fixează regulile pentru orice ecran nou sau corecție.

## Tokeni

| Token | Valoare | Folosire |
|---|---|---|
| `--v2-bg` | `#faf7f2` | fundal pagină |
| `--v2-paper` | `#fffdfa` | carduri |
| `--v2-ink` | `#302b27` | text principal |
| `--v2-muted` | `#71675e` | text secundar (contrast AA pe `--v2-bg`) |
| `--v2-line` | `#e8e0d5` | borduri |
| `--v2-accent` | `#a14b2d` | **o singură acțiune principală pe ecran** (buton plin) |
| `--v2-accent-soft` | `#f5e5da` | insigne, fundal accent |
| `--v2-green` | `#3c5548` | selecție, stări „gata”, progres |
| `--v2-sage` | `#e9eddf` | secțiuni de valoare |
| Titluri | Georgia (serif), accent italic în `--v2-accent` | H1/H2 |
| Text | DM Sans (local, OFL) | corp, butoane |

Breakpoint-uri: 360 (compact), 760 (mobil → tabletă), 900 (desktop cu sidebar). Navigație: bară jos pe mobil (Azi · Descoperă · Planul meu · Profil), sidebar pe desktop.

## Reguli

1. **Mobile-first:** fiecare ecran se verifică la 390×844 fără depășire orizontală (`scripts/capture-review.cjs` raportează `horizontalOverflow`).
2. **O acțiune principală** (buton terracotta) pe ecran; restul sunt secundare (contur) sau link-uri.
3. **Fotografia este informație, nu decor:** arată forma de servire pentru etapă. Fără fotografie aprobată → placeholder-ul cu ingrediente („Prezentare de catalog”), niciodată o fotografie generică care ar sugera altă textură.
4. **Accesibilitate:** skip link, focus vizibil, țintă ≥44 px, `aria-live` pentru anunțuri, `prefers-reduced-motion`, axe în E2E. Textul alternativ descrie preparatul și textura.
5. **Stări:** fiecare listă are loading (schelet), empty (cu o acțiune), error (mesaj + reîncercare) și offline (datele rămân pe dispozitiv).
6. **Încredere:** mesajele despre revizie depind de modul de conținut (`src/features/v2/content/copy.ts`); fără afirmații medicale, fără testimoniale.

## Ecrane

| Ecran | Acțiunea principală | Note |
|---|---|---|
| Homepage | „Hai să găsim o idee de masă” | valoare înainte de cont; demo cu 2 rețete |
| Onboarding | „Continuă” / „Vezi rezultatul meu” | 3 pași, progres, înapoi |
| Rezultat personalizat | „Continuă în spațiul meu” | 3 carduri; **o singură** notă de siguranță sub rezultate (corectat 3 nov.) |
| Rețete | căutare + filtre | carduri cu timp, etapă, salvare |
| Detaliu rețetă | „Adaugă în plan” | alergeni, textură, servire, păstrare |
| Ce gătim azi? | „Vezi rețeta” | bandă sezonieră |
| Planificator | „Arată 5 zile de mese” → „Salvează planul” | alternative ca chip-uri |
| Listă de cumpărături | bifare / „Copiază lista” | „Am acasă” separat |
| Dashboard / Profil | — | copii, etapă, cont |
| Premium | „Mă interesează” | după valoare, fără presiune |

## Corecturi din evaluarea capturilor reale (3 nov.)

| Observație | Decizie |
|---|---|
| Nota de siguranță repetată sub fiecare card din rezultat (3×) | **acceptat, corectat** — o notă comună |
| „Un morcov,puțin timp” fără spațiu pe mobil | **acceptat, corectat** |
| Texte „în curs de revizie” ar fi false în build-ul live | **acceptat, corectat** — text dependent de mod |
| Link-ul „Sari la conținut” vizibil în captura onboarding | **respins** — artefact al capturii full-page (elementul fixed este la `top:-86px` în pagina reală) |
| Bara de navigație peste conținut în capturile full-page | **respins** — artefact al capturii; în viewport bara este fixă jos |
| Toate cardurile folosesc placeholder | **acceptat, amânat** — rezolvat de lotul de 12 fotografii (G6), după revizie |
