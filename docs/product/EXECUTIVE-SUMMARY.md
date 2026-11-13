# Rezumat executiv — DiversiBebe 2.0

*13 nov. 2026 · detalii în PRODUCT-VISION, COMPETITIVE-ANALYSIS, V2-PLANNER-SPEC,
BUSINESS-VALIDATION, ROADMAP (același dosar).*

**Poziționare:** asistentul pentru mesele copilului 6–24 luni din România: ce gătesc azi și
cum organizez zilele următoare, ținând cont de vârstă, alergii și ce a încercat copilul.
Huckleberry e modelul comercial (gratuit util, plata pentru timp economisit), nu de produs:
la ei alimentația e doar jurnal, fără rețete, plan sau listă.

**De construit imediat (P0, ≈ 2 săptămâni):**
1. Planificatorul flexibil: 1/3/5/7 zile, mesele alese de părinte, alergii respectate, înlocuire
   individuală, listă automată. Specificația e gata; **cere aprobarea ta și o migrație mică**
   (producția are acum un singur rând de plan, deci migrarea e fără risc de date).
2. „Azi” = mesele de azi + „Am pregătit” + „A încercat”, care alimentează istoricul.
3. Metrici de activare și retenție pe evenimentele existente; beta privat cu 15–25 de familii.

**De amânat:** plăți, partajare în familie, planuri salvate, export, notificări, aplicație
nativă, AI generativ, comunitate, orice în afara alimentației.

**Ce poate genera venituri:** Premium la 19–29 lei/lună pentru planul pe mai multe zile + listă
(gratuit rămân siguranța, excluderea alergenilor, rețetele de bază, istoricul, planul de o zi).
Piața plătește deja: Rețetaria vinde meniu + listă la 19,99–29,99 lei/lună. Validăm întâi
intenția (pagina /v2/premium există), apoi rezervări, abia apoi plata reală.

**Riscuri principale:**
1. AmiYammi e gratuit, bine evaluat și are generator de meniuri; diferențierea noastră (alergii +
   istoric + listă) trebuie să se vadă în primele 2 minute.
2. Fereastra de nevoie e scurtă (6–18 luni) → retenția și abonamentul anual contează.
3. Rețetele nu au revizie medicală → transparență acum, revizie de specialist când există buget.
4. Plata reală are costuri legale (T&C, facturare, ANPC) → incompatibil cu bugetul 0 până la GO.
5. „Bebe Loves You” nu a putut fi identificat; analiza e incompletă fără link.

**Sprintul recomandat (următoarele 2 săptămâni):**
- Ziua 1: aprobi specificația planificatorului și migrația (`V2-PLANNER-SPEC.md` §10).
- Zilele 1–8: planificator flexibil + Azi + „A încercat”, testat Chromium/WebKit, retest iPhone.
- Zilele 9–10: metrici + invitații beta + publicarea corecției de navigare.
- Ieșire: beta privat pornit, cu criteriile GO/NO-GO din ROADMAP măsurabile din prima săptămână.
