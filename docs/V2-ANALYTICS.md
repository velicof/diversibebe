# Evenimente și măsurarea valorii

Nu există un serviciu plătit sau un dashboard cu cheie privilegiată în browser. Evenimentele conturilor autentificate merg în `product_events`, cu RLS pe proprietar, moment generat pe server și `is_test` derivat din `app_metadata`, nu din formular. Conturile sintetice sunt excluse din toate agregările reale. În explorarea fără cont, evenimentele rămân în memorie și se pierd la reload.

| Eveniment | Declanșare | Proprietăți acceptate |
|---|---|---|
| onboarding_completed | Salvarea etapei și a alegerilor inițiale | niciuna |
| meal_suggestion_viewed | Afișarea rezultatelor | count |
| meal_selected | Prima deschidere a unei rețete din rezultate | elapsedMs |
| recipe_saved | Adăugare la favorite | niciuna |
| meal_added_to_plan | Adăugare sau înlocuire în plan | niciuna |
| meal_used_confirmed | Confirmare explicită opțională | niciuna |
| return_session | Inițializare autentificată a aplicației | niciuna |
| premium_interest | Click explicit pentru una dintre ipoteze | price: 25 sau 69 |

`return_session` descrie o intrare autentificată în aplicație; nu este o sesiune de 30 de minute definită comercial. Reload-urile pot crea intrări distincte. Nu folosi numărul brut al acestui eveniment ca număr de persoane.

Identificatorul unic de eveniment deduplică retrimiterea aceluiași eveniment. Confirmările sunt deduplicate pe utilizator/copil/rețetă/zi de server. Browserul așteaptă salvarea înainte de eveniment; o eroare de salvare nu este convertită în confirmare analitică. După retry, rândul de domeniu este sursa de adevăr chiar dacă evenimentul analitic nu mai este trimis. Evenimentele pot lipsi din cauza rețelei; nu reprezintă contabilitate garantată.

Payload-ul acceptă numai numere finite nenegative `count`, `elapsedMs`, `price`. Nume, email, vârstă, identificator de copil, diagnostic, text liber și identificator de rețetă sunt excluse. `user_id` rămâne un identificator personal pseudonim, necesar agregării pe cont; accesul și retenția trebuie documentate în politica produsului înainte de pilot. Propunere: retenție de 90 zile pentru evenimente, fără ștergere automată activată în această etapă.

## Definiții de calcul

Toate zilele sunt calendaristice în Europe/Bucharest. Exclude `is_test=true`. Conturile fără cohortă matură nu intră în numitorul retenției.

- **DAU:** utilizatori distincți cu o interacțiune relevantă în ziua respectivă: intrare autentificată, selecție, salvare, planificare sau confirmare. Exclude evenimente tehnice și interesul Premium izolat.
- **WAU / MAU:** același criteriu, fereastră mobilă de 7 / 30 zile, cu deduplicare pe utilizator. Nu însuma DAU pentru a obține WAU.
- **Activare:** onboarding finalizat și prima selecție urmată de salvare sau planificare, în primele 24 ore de la onboarding. Nu o echivala cu valoarea confirmată a mesei.
- **Retenție D1/D7/D30:** proporția conturilor activate într-o zi care au o interacțiune relevantă exact în ziua 1/7/30 după ziua activării. Numitor: numai cohorta pentru care acea zi s-a încheiat. Raportează separat revenirea într-o fereastră dacă alegi ulterior altă definiție.
- **Valoare confirmată săptămânal:** cel puțin trei perechi distincte rețetă–zi confirmate pe cel puțin două zile din săptămâna luni–duminică. Sursa: `cooked_recipes.source='v2_confirmed'` și `action_recorded_at`, nu evenimente automate și nu istoricul importat. O confirmare nu dovedește consumul sau efectul clinic.

Exemplu de agregare administrativă read-only, de executat numai într-un context server autorizat:

```sql
SELECT (occurred_at AT TIME ZONE 'Europe/Bucharest')::date AS zi,
       count(DISTINCT user_id) AS dau
FROM public.product_events
WHERE NOT is_test
  AND event_name IN ('return_session','meal_selected','recipe_saved',
                     'meal_added_to_plan','meal_used_confirmed')
GROUP BY 1 ORDER BY 1;
```

Nu publica acest query ca view anon. În raportul final nu sunt inventate valori DAU, retenție sau conversie: mediul conține numai conturi sintetice.
