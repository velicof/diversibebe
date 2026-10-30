# DiversiBebe — funnel de test și plan de experiment

30 octombrie 2026. Implementarea nouă este exclusiv locală. Evenimentele de mai jos nu sunt trimise către Supabase sau un furnizor de analytics. Telemetria V2 anterioară își păstrează contractul existent; schema PostgreSQL nu a fost extinsă pentru funnel-ul nou.

## Date și confidențialitate

Cheia locală de diagnostic este `diversibebe:v2:growth-funnel:test:1`. Sunt păstrate cel mult 500 evenimente în browser; dacă stocarea este blocată, diagnosticul rămâne în memorie. Acesta este un instrument de QA, nu un colector de producție.

Fiecare eveniment are un UUID, momentul clientului, un UUID aleator pentru vizită, un UUID aleator de parcurs când este relevant și proprietăți strict filtrate. Vizita se schimbă după 30 minute fără activitate înregistrată sau într-o sesiune nouă a browserului. UUID-urile din funnel nu sunt ID-uri de cont sau de copil. Timpul clientului și stocarea locală pot fi modificate de utilizator; nu sunt dovezi comerciale sau surse autoritative pentru billing.

Proprietățile acceptate sunt `step`, `count`, `elapsedMs`, `daysSinceLastVisit`, `message` (A/B/C), `flow` (guided/classic), `valueKind` (demo/guide/empty/blocked). Nu se înregistrează răspunsurile, etapa/vârsta, ingrediente, nume, emailuri, diagnostice, alergii sau identitatea copilului. Necunoscutele și textul liber sunt eliminate de `sanitizeFunnelProperties`.

Răspunsurile de personalizare sunt o structură separată, minimă, validată la citire. Sunt locale pe browser, separate între explorarea fără cont și perechile cont–profil. Nu sunt analytics și nu se sincronizează automat pe alte dispozitive. Rezultatul se poate transfera explicit din explorarea fără cont către sesiunea de test; transferul expiră după o oră și se consumă o singură dată.

## Evenimente și deduplicare

| Eveniment | Trigger efectiv | Deduplicare |
|---|---|---|
| `homepage_view` | Homepage vizibil după alegerea variantei | O dată pe vizită |
| `onboarding_started` | Intrarea în parcursul ghidat; separat, intrarea în parcursul clasic | O dată pe parcurs și vizită; control separat |
| `question_completed` | Continuare după un răspuns sau saltul explicit al contextului opțional | O dată pe numărul întrebării, parcurs și vizită |
| `personalized_result_viewed` | Rezultatul este randat; controlul folosește prima vedere a dashboard-ului după parcursul său | O dată pe parcurs și vizită; `valueKind` separă un rezultat util de lipsa eligibilității |
| `recipe_opened` | Navigarea la detaliul unei rețete | O dată pe ruta rețetei și vizită; ID-ul rețetei nu intră în proprietăți |
| `signup_started` | Contract pregătit; **nu este emis** în fixture-ul actual | Viitorul flux trebuie să-l emită la începerea unei înregistrări reale |
| `signup_completed` | Contract pregătit; **nu este emis** în fixture-ul actual | Va necesita confirmarea reală a creării contului; nu se deduce dintr-un click sau login |
| `recipe_saved` | Observarea adăugării unei favorite în starea confirmată a aplicației | O dată pe rețetă și vizită; încărcarea inițială și schimbarea contului nu se numără ca salvare |
| `return_visit` | O vizită nouă după cel puțin 30 minute de la activitatea locală anterioară | O dată pe vizită; se înregistrează doar distanța în zile |
| `premium_interest` | Click pe interes lunar sau pachet; fără checkout | O dată pe ofertă și vizită |
| `result_saved` | Salvarea locală a rezultatului ori finalizarea importului explicit în cont | O dată pe parcurs și vizită |
| `account_prompt_viewed` | Invitația la cont apare după păstrarea rezultatului | O dată pe parcurs și vizită |
| `login_started` / `login_completed` | Încercarea validată / răspunsul reușit al autentificării sintetice | Evenimente distincte de înregistrare; pot apărea la fiecare login |

Deduplicarea emiterii folosește chei în sessionStorage și un fallback în memorie. UUID-ul evenimentului permite deduplicarea unui export ulterior. Nu există retry de rețea pentru aceste evenimente deoarece nu sunt expediate. Reload-ul în aceeași vizită nu dublează primul rezultat. O vizită ulterioară poate înregistra din nou vederea unui rezultat păstrat.

## Metrici definite

- Inițiere: vizite cu `onboarding_started` / vizite cu `homepage_view`, separat pe mesaj și parcurs.
- Finalizare: parcursuri cu `personalized_result_viewed` / parcursuri începute. Se separă cazurile demo, ghid, empty și blocked.
- Primul rezultat util: parcursuri cu `valueKind` demo sau guide / parcursuri începute. Ghidul educațional nu este o rețetă validată clinic.
- Timp până la valoare: mediana și percentila 75 ale `elapsedMs` la primul rezultat util dintr-un parcurs. Se exclud sesiunile sintetice; pauzele și reluările sunt raportate separat. Valoarea actuală măsoară timp calendaristic de la începerea draftului, nu timpul activ de interacțiune.
- Rezultat → cont: pentru viitorul signup real, parcursuri cu rezultat util și cont confirmat / parcursuri cu rezultat util. **Indisponibil comercial acum**. `login_completed` nu este substitut.
- Revenire în șapte zile: în QA, `return_visit` cu `daysSinceLastVisit` între 1 și 7 arată doar revenirea în același browser față de ultima vizită. Nu este retenție D7 de cohortă. Pentru măsurarea reală sunt necesare un identificator pseudonim acceptat, cohorta primei activări, o sursă de timp de server și reguli de confidențialitate/retenție aprobate.

Un browser local și conturile sintetice nu pot furniza rate comerciale relevante. Nu se declară o creștere de conversie din aceste teste.

## Variante inspectabile local

- Mesaj A: `http://127.0.0.1:3100/v2?mesaj=A&parcurs=nou`
- Mesaj B, implicit: `http://127.0.0.1:3100/v2?mesaj=B&parcurs=nou`
- Mesaj C: `http://127.0.0.1:3100/v2?mesaj=C&parcurs=nou`
- Parcursul anterior: `http://127.0.0.1:3100/v2?mesaj=B&parcurs=clasic`

Alegerea rămâne în sesiunea browserului. Parametrii sunt o unealtă de inspecție; nu există repartizare aleatoare activată sau trafic real într-un test A/B. Schimbarea explicită a parametrilor înlocuiește alegerea. Mesajul și parcursul sunt câmpuri separate în schemă, însă **controlul clasic păstrează și conținutul homepage-ului vechi**: comparația clasic/nou este a experienței în ansamblu, nu dovada efectului izolat al chestionarului. Componentele vechi folosesc shell-ul comun actual; capturile before și checkpoint-ul Git păstrează baseline-ul vizual exact. Variantele A/B/C se compară între ele pe parcursul nou. Pentru izolarea strictă a efectului onboardingului, viitorul experiment trebuie să țină același homepage și mesaj în ambele brațe.

Înaintea unui experiment real: stabilim o singură dimensiune schimbată, metrica principală, efectul minim detectabil, calculul dimensiunii eșantionului, perioada minimă și regula de încheiere. Excludem vizitele proprii și testele sintetice; verificăm repartizarea și pierderea evenimentelor. Un eșantion mic rămâne feedback exploratoriu. Nu alegem câștigătorul prin opriri repetate când apare temporar o diferență favorabilă.
