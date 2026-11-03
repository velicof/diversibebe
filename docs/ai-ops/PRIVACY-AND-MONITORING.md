# Analytics, politica de confidențialitate și monitorizarea erorilor (cost 0)

## 1. Ce colectează V2 (verificat în cod și în migrații)

| Date | Unde | Conținut | Ștergere |
|---|---|---|---|
| Evenimente de produs | `product_events` | **numai** nume din listă (onboarding, rețetă văzută/salvată, adăugată în plan, folosită, listă de cumpărături, interes Premium) și valori numerice (`count`, `elapsedMs`, `price`). Baza refuză orice alt câmp: fără email, nume, copil, alergii sau text liber | automat la ștergerea contului (`ON DELETE CASCADE`) |
| Preferințe și plan | `user_preferences`, `meal_plans` | etapa, cămara, lista bifată, planul pe zile | idem |
| Vizitator fără cont | browserul (localStorage) | alegerile, favoritele, planul; un identificator de vizită aleator | rămân pe dispozitiv; „Șterge datele din browser” din Profil |
| BebeAsist | — | oprit în V2: nicio dată trimisă către un model AI | — |
| Fotografii | — | imagini generate cu AI, etichetate „Imagine generată” | — |

Fără cookie-uri de marketing, fără instrumente de analiză terțe și fără transfer către alte companii pentru analytics.

## 2. Text propus pentru politica de confidențialitate

*Îl publici tu (conținut public). Recomand o verificare juridică înainte de lansarea publică.*

> **Măsurarea folosirii aplicației (DiversiBebe 2.0)**
> Pentru a înțelege ce funcții sunt utile, înregistrăm evenimente simple de utilizare, de exemplu „a fost adăugată o rețetă în plan” sau „a fost generată lista de cumpărături”, împreună cu valori numerice precum numărul de elemente. Aceste evenimente nu conțin numele tău, adresa de email, numele copilului, alergii sau texte scrise de tine. Ele sunt legate de contul tău doar pentru a putea fi șterse odată cu el și sunt păstrate în infrastructura DiversiBebe (Supabase, Uniunea Europeană). Nu folosim instrumente de analiză ale altor companii și nu vindem date. Dacă folosești aplicația fără cont, alegerile tale rămân doar în browser și le poți șterge oricând din Profil.
>
> **Conectarea cu Google**
> Dacă alegi „Continuă cu Google”, primim de la Google adresa de email, numele afișat și imaginea de profil, pentru a crea sau a deschide contul DiversiBebe.
>
> **Imagini**
> Unele fotografii de rețete sunt generate cu ajutorul inteligenței artificiale și sunt marcate ca atare. Ele ilustrează rețeta și nu înlocuiesc instrucțiunile de servire.

De confirmat de tine:
- regiunea proiectului Supabase (`eu-west-1`, Irlanda);
- dacă politica actuală menționează deja Google și Resend (emailurile de resetare).

## 3. Monitorizarea erorilor, fără servicii plătite

| Sursă | Ce prinde | Cum o folosim |
|---|---|---|
| Vercel Runtime Logs / `get_runtime_errors` | erori pe server (rute, proxy, randare) | citite read-only după fiecare deploy și zilnic în canary și beta; retenția pe Hobby este scurtă, deci verificarea se face în aceeași zi |
| Vercel Deployments | build eșuat, deploy blocat | notificarea Vercel (email) este gratuită |
| Supabase Logs + Advisors | erori Auth, PostgREST, Postgres; probleme de securitate | după migrații, apoi săptămânal; advisors fără ERROR |
| `v2-postflight.sql`, `v2-accounts-check.sql` | starea schemei și a conturilor | după migrații și după orice rollback |
| `src/app/v2/error.tsx` | erori în browser: utilizatorul vede un mesaj de reîncercare | fără trimitere automată (ar putea conține date). Problemele raportate de tine sau de familiile din beta se reproduc local |

Nu adăugăm Sentry sau un alt serviciu până nu există o decizie privind costul și acordul de prelucrare a datelor.

**Rutina în canary și beta** (10 minute pe zi, read-only):
1. Erorile Vercel din ultimele 24 h.
2. Advisors Supabase.
3. Numărul de evenimente `onboarding_completed` și `meal_added_to_plan` (agregat), ca să știm că fluxul funcționează.
4. Feedbackul primit.

**Prag de oprire:**
- orice eroare care afectează V1 → Instant Rollback (etapa L0);
- orice scriere greșită în V2 → `v2-disable.sql` (L1).
