# Quality gates — GO/NO-GO V2

Regulă: **o condiție lipsă sau neverificată = NO-GO** pentru treapta respectivă. Rezultatele istorice nu se refolosesc ca teste noi; fiecare decizie citează rularea din `outputs/<data>/tests/`.

Două trepte:
- **Beta privată:** 20–30 de familii invitate, `/v2` cu cod de invitație, date reale în Supabase producție.
- **Publicare:** `/v2` deschis tuturor (sau înlocuirea V1).

| # | Condiție | Verificare | Beta | Publicare |
|---|---|---|---|---|
| G1 | Nicio vulnerabilitate critică deschisă | Supabase advisors fără ERROR; P0 reconfirmat prin metadate; `security-review` pe diff; scanare de secrete | obligatoriu | obligatoriu |
| G2 | Nicio expunere între familii/copii | teste SQL (PGlite), HTTP (PostgREST real), E2E native cu 2 familii și 2 copii; după migrare: aceleași teste pe staging | obligatoriu | obligatoriu |
| G3 | Fluxurile esențiale E2E | onboarding → rețetă → salvare → plan 5 zile → listă → revenire după login; cont nou, cont existent, recuperare parolă, refresh, două sesiuni, backend indisponibil | local + staging | local + staging + producție (smoke) |
| G4 | Backend online verificat | staging Supabase + Vercel Preview: signup cu email real (SMTP), login, recuperare, RLS | obligatoriu | obligatoriu |
| G5 | Migrații și rollback testate | `v1-compat`, `schema-drift`, `rollback` verzi; set aplicat pe staging fără erori; backup logic al producției înainte | obligatoriu | obligatoriu |
| G6 | Conținut revizuit de specialist calificat | fiecare rețetă afișată are `editorialRegistry` cu revizor uman, calificare, dată, surse https; ≥20 rețete, toate mesele, etapele 6/8/10/12; build fără `NEXT_PUBLIC_V2_CONTENT_MODE` | obligatoriu (rețetele din beta) | obligatoriu |
| G7 | Fără afirmații medicale sau testimoniale nejustificate | grep pe copy V2 + revizie umană; V1: „aprobate de nutriționiști” + testimonial rezolvate | V2 obligatoriu | V1 + V2 |
| G8 | Preview pe telefon fizic și desktop | fondatorul: iOS Safari + Android Chrome — onboarding, plan, listă, login, recuperare parolă din email, rotire ecran, text mărit 200%, VoiceOver/TalkBack pe un flux | obligatoriu | obligatoriu |
| G9 | Analytics funcțional și confidențial | evenimentele din `docs/V2-ANALYTICS.md` apar în `product_events`; allowlist; fără PII; mențiune în politica de confidențialitate | obligatoriu | obligatoriu |
| G10 | Monitorizarea erorilor | Vercel runtime errors + Supabase logs verificate zilnic în beta; runbook de rollback | obligatoriu | obligatoriu |
| G11 | Costuri operaționale cunoscute | tabelul din `ARCHITECTURE.md` §7 aprobat de fondator; Vercel Pro înainte de orice plată | obligatoriu | obligatoriu |
| G12 | V1 continuă să funcționeze | patch V1 publicat înaintea migrațiilor; după migrații: jurnal, „am încercat”, „am gătit” verificate în producție | obligatoriu | obligatoriu |
| G13 | Acces controlat | beta: `/v2` → `/acces-beta` fără cod; noindex; Preview protejat de Vercel Authentication | obligatoriu | — |

## Verificări automate (rulate la fiecare candidat)

```
node scripts/native-runtime.cjs
node scripts/native-command.cjs build
node scripts/native-command.cjs typecheck
npm run lint:v2
node scripts/native-command.cjs test        # unit + SQL + HTTP + Auth + compat + drift + gate
node scripts/native-command.cjs e2e
node scripts/capture-review.cjs <out>       # capturi anonimizate + depășire orizontală
```

## Fotografii (G6 extins)

O fotografie se publică numai dacă: fișierul corespunde `recipeId` din manifest; ingredientele vizibile există în rețetă; textura corespunde etapei; nicio formă nesigură (lista `mustNotAppear`); porție de copil; condițiile de utilizare comercială ale generatorului verificate și notate (`termsUrl`); etichetă „imagine generată”; aprobare umană (`reviewedBy`). WebP 800 px ≤150 KB (impus de `scripts/photo-import.cjs`).
