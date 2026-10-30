# DiversiBebe 2.0 — experiență orientată spre valoare

30 octombrie 2026. Implementare locală, fără publicare. Noul homepage, onboardingul și trecerea în V2 sunt funcționale. **GO pentru evaluarea demonstrației locale cu date sintetice. NO-GO pentru pilot cu familii reale sau lansare publică.**

Preview recomandat: [experiența nouă, mesaj B](http://127.0.0.1:3100/v2?parcurs=nou&mesaj=B). [Începe onboardingul](http://127.0.0.1:3100/v2/onboarding). [Experiența anterioară](http://127.0.0.1:3100/v2?parcurs=clasic&mesaj=B).

## Ce este implementat

| Cerință | Rezultat local |
|---|---|
| Homepage orientat spre problemă și beneficiu | Hero nou, probleme recognoscibile, CTA de explorare, demonstrație interactivă reală, continuitate și limite explicite |
| Headline-uri A/B/C | Variante inspectabile local; B implicit. Evaluare euristică în RESEARCH-UX.md; nu există un câștigător măsurat |
| Onboarding conversațional | O provocare principală din șase, o categorie de etapă din șase, un context adaptat; contextul poate fi sărit |
| Progres și revenire | Indicator cu semantică accesibilă, răspunsuri selectabile cu tastatura, focus pe noua întrebare, înapoi, refresh și reluare |
| Rezultat înainte de cont | Până la trei exemple reale din catalog, durată, ingrediente și explicația filtrării; zero potriviri este un rezultat explicit |
| Pre-diversificare / educație | Resurse cu sursă, fără idei de mese premature. Pagina /v2/pregatire este accesibilă fără cont |
| Salvare și cont | Salvare imediată în browser; transfer explicit al rezultatului către login-ul sintetic și import aditiv în favorite. Înregistrarea reală nu este simulată |
| Personalizarea revenirii | Un modul prioritar după obiectiv, idei filtrate, acces la plan sau resurse, preferințe modificabile din profil; fără streak-uri |
| Premium | Comparație clară între funcțiile disponibile și propunerile Plus, interes de test, fără checkout sau abonament activat |
| Imagini | Două ilustrații fotorealiste originale, doar la rețetele corespunzătoare, marcate «Ilustrație generată · demo». Fotografia de hero este de atmosferă |
| Funnel | Evenimente locale cu proprietăți strict filtrate, deduplicare, variante de mesaj și experiență; contract pentru signup real pregătit, fără evenimente fictive de înregistrare |
| Funcțiile existente | Descoperire, favorite, plan, cumpărături, confirmări, istoric și conturi sintetice păstrate; toate scenariile anterioare au trecut |

## Schimbări de marketing și UX

- Punctul de intrare este o nevoie recognoscibilă, urmată de o alegere mică. O singură provocare principală păstrează fluxul scurt; nu presupunem că rezolvăm toate problemele unei familii.
- Mesajul B pune beneficiul în față. A și C pot fi inspectate fără a schimba produsul de bază. Matricea editorială explică de ce B este punctul de pornire, nu un câștigător statistic.
- Demonstrația din homepage filtrează efectiv rețetele de dovlecel și morcov/cartof dulce după bugetul de timp. Linkurile deschid detaliile reale, iar butoanele de salvare folosesc funcționalitatea existentă.
- Întrebarea a treia diferă pentru lipsă de timp, idei, organizare, pregătire/servire și mese fără presiune. Alegerea frigiderului expune ingredientele numai când sunt relevante.
- Rezultatul explică de ce apar exemplele. Când nu există eligibilitate, nu lărgim filtrele în secret și nu prezentăm o recomandare generică drept personalizare.
- Invitația la cont apare după păstrarea rezultatului. Bannerul de login este ascuns în paginile de intrare pentru vizitatorii fără cont. Explorarea și resursele esențiale rămân accesibile.
- Preferințele de explorare nu suprascriu profilul copilului autentificat. Răspunsurile și rezultatele sunt separate pe browser/cont/profil; trecerea de la un cont la altul nu transferă implicit preferințele.
- Schimbarea profilului la etapa de pregătire oprește sugestiile anterioare și în dashboard. O masă planificată care nu mai este eligibilă pentru selecția curentă nu este promovată ca sugestie; datele din plan rămân păstrate.

## Verificare executată

| Verificare | Rezultat |
|---|---|
| Build Next.js V2 | PASS |
| TypeScript | PASS |
| Lint V2 | PASS, zero erori și avertismente |
| Lint scripturi/teste/configurație Playwright | PASS |
| Teste unitare, SQL și HTTP | **69/69 PASS**, zero omise |
| Playwright Chromium, suită completă | **100/100 PASS**, zero omise, aproximativ 3,6 minute |
| Regresii anterioare | Cele 78 scenarii existente au trecut; intrarea testului pentru onboardingul anterior folosește explicit controlul clasic |
| Combinații onboarding | Toate cele 36 combinații provocare × etapă sunt verificate la nivel de logică; scenariile reprezentative sunt parcurse și în browser |
| Responsive | Ecranele existente la 320/375/390/430/768/1440; noul parcurs și rezultatul la 320/390/768/1440 |
| Accesibilitate automată | Axe pe ecranele existente, noul onboarding și rezultatele responsive; fără încălcări detectate în scenariile testate |
| QA vizual suplimentar | Homepage, întrebări, context, rezultat, dashboard, Premium; fără overflow, imagini defecte sau erori JS detectate în verificarea comparabilă |
| Lint întreg repository | **46 erori și 29 avertismente în codul vechi**, aceleași totaluri ca în livrarea anterioară |

Testele noi acoperă prima vizită, parcursul complet, ramuri diferite, lipsa eligibilității, saltul contextului, înapoi și refresh, salvarea rezultatului, autentificarea și importul explicit, profiluri/conturi separate, stocare browser blocată, tastatură, variantele de headline și revenire sintetică. Testul care mută ceasul local pentru revenire este un test tehnic, nu dovadă de retenție comercială.

Primele runde au identificat: un API web absent din sandbox-ul testelor Node, un atribut ARIA fără rolul necesar, o citire de test făcută înaintea hidratării după refresh și un API local oprit la întreruperea sesiunii. Acestea au fost rezolvate, iar logurile primelor încercări sunt păstrate separat. Rezultatele de mai sus sunt din runda finală, nu din încercările incomplete.

## Date, conținut și limite

Catalogul existent este reutilizat. **Nicio rețetă nu a primit o validare clinică nouă**. Filtrele și imaginile demonstrative nu confirmă siguranța, toleranța sau forma de servire pentru un copil. Instrucțiunile din rețete rămân în curs de revizie. Resursele externe NHS sunt prezentate cu sursa și cu mențiunea că rezumatele nu reprezintă revizia clinică a aplicației.

Pentru categoriile UX folosim conservator etapele deja existente în motor: pregătire → 0, 6–8 → 6, 9–12 → 8, categoriile peste 12 luni → 12. Acesta este un filtru al catalogului, nu o evaluare a dezvoltării. În cont, limita profilului existent este păstrată și poate exclude exemplele. Un rezultat păstrat este reverificat înainte de afișare; nu ocolește blocajele clinice sau profilul curent.

Autentificarea și API-ul sunt în continuare fixture-ul sintetic local, cu PostgreSQL/PGlite. Nu este validat stack-ul complet GoTrue/PostgREST. Conturile reale, signup-ul comercial, plățile și emailurile nu au fost activate. Salvarea într-un cont folosește doar conturile sintetice și serviciul loopback. Preferințele UX și marcarea ghidului ca păstrat rămân pe dispozitiv; favoritele/planul își păstrează persistența de test existentă.

Funnel-ul nou nu trimite date în afara browserului. Include maximum 500 evenimente locale și nu colectează răspunsuri, date medicale sau identitatea copilului. `signup_started` și `signup_completed` sunt contracte pregătite pentru viitorul flux real; login-ul de test are evenimente separate. Nu există repartizare aleatoare într-un A/B test și nu se raportează conversii comerciale din traficul sintetic. Detalii și formule: ANALYTICS-GROWTH.md.

## Ipoteze de conversie — încă neconfirmate

1. Un beneficiu concret și o problemă recognoscibilă ar putea crește inițierea față de prezentarea unei liste de funcționalități.
2. O demonstrație reală înainte de cont ar putea reduce incertitudinea și abandonul la primul contact.
3. Întrebările scurte care modifică rezultatul ar putea crește relevanța percepută și finalizarea, fără colectarea de date inutile.
4. Salvarea imediată și păstrarea progresului ar putea reduce pierderea valorii între vizită și autentificare.
5. Favoritele și planul pentru câteva zile ar putea susține revenirea prin utilitate, fără presiune zilnică.

Aceste argumente sunt ipoteze. Cercetarea publică a șase produse informează designul, fără să dovedească efectul în România. Este necesară testarea cu utilizatori și apoi un experiment dimensionat înainte de orice afirmație de creștere a conversiei. Comparația clasic/nou actuală este a experienței complete; nu izolează singură efectul chestionarului.

## Ce mai blochează lansarea

- Revizie clinică documentată a conținutului alimentar și a adaptărilor în română.
- Validarea Supabase complet, inclusiv signup, refresh/revocare, compatibilitatea cu aplicația veche și backup/restore.
- Implementarea și aprobarea unui sistem de analytics de producție cu cohortare, timp de server, retenție a datelor și trafic suficient. Diagnoza locală actuală nu măsoară retenție D7 reală.
- Teste cu părinți, dispozitive reale, Safari/iOS, Android și cititoare de ecran. Axe și viewport-urile Chromium nu certifică accesibilitatea completă.
- Remedierea separată a datoriilor din lint-ul vechi și toate criteriile de lansare din raportul MVP anterior.

## Cod, capturi și repornire

Branch: `codex/diversibebe-growth-onboarding`.

Referință restaurabilă de dinainte: `codex/diversibebe-before-growth-20261030`, commit `ac4bc1a`, care include compatibilitatea laptopului nou. Branch-ul MVP original rămâne păstrat. Nu s-a făcut push sau merge remote. `before-growth.bundle` și `source-before.zip` păstrează suplimentar starea inițială.

Repository:

```text
E:\App creation\DiversiBebe\Documents\Codex\2026-10-26\files-pasted-by-the-user-misiune\work\diversibebe
```

Livrabilele din acest director: `before/`, `after/`, `GALERIE.html`, `tests/`, `RESEARCH-UX.md`, `ANALYTICS-GROWTH.md`, `ASSETS-GENERATED.md`, `Start-Preview.ps1`. Identificatorul final de commit și amprentele sunt în `VERSIUNE.json` și `MANIFEST-SHA256.json`.

Repornire din PowerShell:

```powershell
& 'E:\App creation\DiversiBebe\Documents\Codex\2026-10-26\files-pasted-by-the-user-misiune\outputs\growth-2026-10-30\Start-Preview.ps1'
```

Scriptul verifică/pornește API-ul și preview-ul în fundal, legate de `127.0.0.1`. Folosește copia de test `laptop-20261028`. Build nou după modificări de cod: `npm.cmd run build:v2`, din repository, cu preview-ul oprit înainte de înlocuirea build-ului.

Nu au fost modificate producția, Supabase remote, Vercel sau GitHub remote. Nu au fost activate abonamente, checkout, trial-uri, costuri de hosting sau servicii comerciale. Originalele și rapoartele livrării anterioare sunt păstrate.
