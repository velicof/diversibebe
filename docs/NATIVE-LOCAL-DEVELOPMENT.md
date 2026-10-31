# DiversiBebe: dezvoltare cu Auth real, local

Preview: http://127.0.0.1:3100/v2?parcurs=nou&mesaj=B

Branch: codex/diversibebe-real-auth-persistence. Checkpoint anterior: codex/diversibebe-before-real-auth-20261030 (373e2a1). /v2 și /v2/onboarding sunt rute din aplicația Next.js principală.

## Pornire pe acest laptop

Din repository, în PowerShell:

    node scripts/prepare-native-windows.cjs
    node scripts/native-runtime.cjs
    node scripts/native-command.cjs seed
    node scripts/native-command.cjs build
    node scripts/native-command.cjs preview

Ultima comandă ține preview-ul activ până la oprire; serviciile native sunt lansate ascuns. Nu rula build în timpul verificărilor în browser. Nu porni simultan două preview-uri pe 3100. Nu folosi comenzile de resetare a bazei.

Verificări: node scripts/native-command.cjs typecheck / lint / test / e2e. Varianta npm run lint:v2 verifică și remediile de securitate. Testele E2E durează mai mult decât API-ul simulat. Cheia publică anon este transmisă browserului; service_role și parolele serverului sunt citite numai de scripturile Node locale și nu sunt NEXT_PUBLIC.

## Servicii reale și limite

PostgreSQL 17.11 pe 54322, GoTrue Auth v2.197.0 pe 54326, PostgREST 16.5 pe 54327, proxy de transport pe 54321, Mailpit 1.32.0 UI pe 54324 / SMTP 54325. Toate ascultă numai pe 127.0.0.1. Nu există Docker sau WSL funcțional aici. Organizația velicof a atins limita de proiecte gratuite active; nu s-a creat proiect cloud, nu s-a activat tarif și nu s-au oprit alte proiecte.

Acestea sunt servicii reale Auth/SQL, cu parole hashate, JWT-uri, refresh tokens, PKCE și RLS. Nu reprezintă întreaga platformă Supabase: Storage, Realtime, Edge Functions, dashboard și comportamentul unui deployment cloud complet rămân neverificate. Mediul anterior contract-fixture rămâne disponibil separat; nu este folosit de comenzile native.

Auth a necesitat o modificare îngustă a listenerului Windows: net.ListenConfig fără syscall/unix SO_REUSEPORT. Fișierul original serve_cmd.go.original este păstrat în runtime. Logica Auth, criptografia și migrațiile oficiale nu au fost înlocuite. PostgreSQL folosește un arbore derivat postgres-background/pgsql, cu câmpul PE Subsystem schimbat 3→2 în postgres.exe pentru ca procesele copil să nu deschidă console. Arborii vendor și datele originale sunt păstrate. Manifestul local windows-launcher.json conține hashurile. PostgREST încarcă DLL-urile din arborele PostgreSQL prin PATH al procesului, fără schimbări globale Windows.

În test, emailurile se autoconfirmă, adresele trebuie să fie @example.test, iar JWT-urile expiră în 120 secunde. PostgREST permite încă 30 secunde de toleranță de ceas; testul așteaptă expirarea efectivă. Recuperarea generează email real, capturat de Mailpit, fără relay extern. Aceste setări nu sunt configurație de lansare.

## Date și migrații

Runtime-ul, baza și secretele sunt în ../real-supabase-runtime, în afara Git. private/accounts.json conține trei conturi sintetice; a treia intrare este founder@example.test. Seed-ul adaugă date lipsă, fără resetare: profil de 8 luni, două idei salvate și trei zile de plan. Nu publica fișierul de credențiale. La o nouă mutare trebuie transferat și runtime/private sau un backup PostgreSQL verificat; numai sursele Git nu păstrează conturile noi.

Preferințele onboardingului sunt în user_preferences.journey_preferences, separat per copil. Favoritele sunt familiale; planurile, introducerile, confirmările și preferințele journey sunt per copil. Etapa aleasă în explorarea unui cont existent nu suprascrie profilul copilului. Rezultatele sunt revalidate la citire. Un copil nou pornit din signup folosește etapa deja aleasă în onboarding; fără alegeri începe cu pregătire.

Migrațiile real_auth_journey și real_auth_journey_legacy_compat sunt aplicate numai bazei locale. A doua păstrează istoricul legacy, dar elimină unicitatea globală user/recipe care bloca confirmările între frați/zile. Paginile vechi citesc explicit istoricul neasignat/legacy; helperul de alimente identifică și copilul. Nicio înregistrare veche nu este atribuită automat unui copil.

Compatibilitatea SQL relevantă este testată. Autentificarea UI veche și întregul ei parcurs nu sunt declarate validate: preview-ul dezactivează clientul generic de producție la 127.0.0.1:9, iar V2 folosește sesiunea izolată. Schimbările legacy și migrațiile trebuie revizuite și livrate împreună într-un staging complet înainte de orice publicare.

Rapoartele, planul pilot și patch-urile autonome sunt în ../../outputs/real-app-2026-10-30. Numele folderului păstrează data începerii; verificările finale sunt din 31 octombrie 2026. Producția și GitHub remote nu au fost modificate.
