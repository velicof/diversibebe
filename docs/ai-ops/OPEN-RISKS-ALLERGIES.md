# Riscuri deschise: reacții alimentare și validarea ingredientelor

*14 nov. 2026 · ce aplicația **nu** știe sau nu poate garanta. Niciunul nu e rezolvat prin cod; toate cer
decizie de produs sau revizie de specialitate.*

## A. Interpretarea reacțiilor înregistrate în V1

| # | Risc | Ce face aplicația acum | Consecință | Ce ar trebui decis |
|---|---|---|---|---|
| A1 | O reacție notată în jurnal după o **rețetă** nu spune care ingredient a provocat-o | Exclude toate alimentele rețetei și alergenii ei UE (ex. banană, avocado, lapte) | Prudent, dar poate exclude mult mai mult decât trebuie (lactatele, în cazul tău) | Un flux prin care părintele precizează alimentul suspectat, fără ca aplicația să interpreteze simptome |
| A2 | „Reacție” ≠ diagnostic de alergie (poate fi intoleranță, iritație, coincidență) | Orice înregistrare din `allergy_records` e tratată ca alergie | Nu distingem; nu sugerăm reintroducerea | Textul trimite la medic; nicio logică de „reintroducere” fără specialist |
| A3 | Severitatea din V1 („ușoară”/„severă”) | Ignorată: orice alergie exclude la fel | Siguranță uniformă; fără nuanțe | Rămâne așa până la revizie medicală |
| A4 | Alergiile V1 nu au copil (`baby_id` gol) | Se aplică tuturor copiilor contului până la asocierea explicită | Al doilea copil poate fi filtrat inutil | Asocierea explicită din Profil (există) |
| A5 | Ștergerea unei alergii în V1 | V2 o vede imediat ca inexistentă | Rețetele revin în recomandări | Corect tehnic; părintele decide în V1 |

## B. Validarea ingredientelor

| # | Risc | Ce face aplicația acum | Consecință |
|---|---|---|---|
| B1 | Potrivirea se face pe **textul** ingredientelor (forme românești, diacritice, derivate) | Liste de cuvinte și grupe UE, testate pe toate cele 73 de alimente V1 | Un ingredient scris neobișnuit poate scăpa; derivatele rare pot lipsi |
| B2 | Ingrediente care pot ascunde alergenul (pâine, biscuiți, sosuri, „fructe”, „condimente”) | Rețeta devine „insuficient verificată” și nu e propusă | Prudent; poate goli unele tipuri de masă |
| B3 | Etichetele de alergeni ale rețetelor sunt derivate automat, fără revizie de specialist | Afișăm statutul editorial; nu promitem „100% sigur” | Erorile catalogului se propagă în filtrare |
| B4 | Produsele cumpărate (mărci, urme, contaminare încrucișată) | Nu sunt cunoscute; mesajul medical o spune | Responsabilitatea etichetei rămâne la părinte |
| B5 | Alimente scrise de mână în V1 | Recunoaștem alimentele numite; cuvintele necunoscute lasă rețetele „neverificate” | Plan gol pentru alimente exotice (intenționat prudent) |
| B6 | Serverul nu cunoaște ingredientele | Excluderea e făcută în aplicație; serverul verifică doar proprietarul și etapa | Un client modificat ar putea salva o rețetă cu alergen în propriul cont |

## Ce reduce riscul înainte de beta (fără funcții noi)
1. Revizia de specialitate a etichetelor de alergeni pentru rețetele cele mai folosite (cost extern).
2. Mesajul medical rămâne vizibil în Azi, Descoperă, Plan, Profil (există).
3. În beta: orice raport „rețetă cu alergen propusă” = incident, se oprește beta-ul până la analiză.
4. Formularea reacțiilor rămâne a părintelui; aplicația nu interpretează simptome.
