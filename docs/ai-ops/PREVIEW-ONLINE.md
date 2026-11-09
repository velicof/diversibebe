# V2 online: Preview protejat, cu conturi reale

Scop: V2 deschis de pe telefon, fără Tailscale și fără laptop pornit. Rămâne privat; `www.diversibebe.com` rămâne V1.

## Cum e protejat (trei straturi)

1. **Vercel Authentication**: deja activă pentru toate Preview-urile. Numai contul tău Vercel deschide adresa.
2. **Cod de invitație**: `/v2` cere codul (`/acces-beta`). Fără cod sau cu cod greșit, redirect; consola de revizie are cod separat.
3. **Conturi reale, cu RLS**: aceleași conturi ca în V1; fiecare familie își vede doar datele (verificat după migrații).

Adresa, după push: `https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2`

## Gata, local (9 nov.)

- `release/v2-rc` conține `main`: cele 19 fișiere V1 sunt identice cu versiunea live.
- Build-ul cu mediul Preview, verificat local: ieșire în `.next`, cum o cere Vercel; poarta de invitație funcționează; formulările sunt pentru conturi reale; butonul Google e prezent; 0 erori ca vizitator și nicio cerere către Supabase până la conectare.
- Codurile de acces sunt generate în `%USERPROFILE%\DiversiBebe-backups\preview-access-codes.txt`, accesibil doar contului tău Windows, nu în repository. Hash-urile pentru Vercel sunt în `preview-env.txt`, în același folder.

## Ce nu poate expune Preview-ul (verificat 9 nov.)

- **Chei privilegiate în browser:** niciuna. Bundle-ul construit cu mediul Preview nu conține `service_role`, `sb_secret_`, chei Resend sau Anthropic. V2 folosește doar cheia publică `sb_publishable_…`.
- **Datele altor familii:** RLS după migrații. Cu cheia publică, 9 tabele și funcția V2 răspund 401; un cont vede 0 copii din alte familii.
- **Consola de revizie:** cere un cod separat. Codul de invitație o redirecționează (307).
- **De reparat înainte:** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` și `RESEND_API_KEY` sunt setate și pentru ținta Preview, iar Vercel le marchează „readable-secret”. Niciun cod din branch nu le folosește (`supabaseAdmin` nu e importat nicăieri), dar un Preview le-ar avea pe server. Pasul C de mai jos le scoate din Preview; Production rămâne neschimbat.
- **Verificarea de după push:** cu sesiunea ta Vercel în Chrome. Nu folosesc linkurile de partajare Vercel, care ar deschide Preview-ul oricui are linkul, timp de 23 de ore.

## Cere aprobarea ta (le face agentul, după „da”)

| # | Acțiune | Efect | Înapoi |
|---|---|---|---|
| A | Variabile Vercel, ținta **Preview**, doar branch-ul `release/v2-rc` (tabelul de mai jos) | nu ating Production și nici alte branch-uri | se șterg variabilele |
| B | **Push** `release/v2-rc` pe GitHub (fără PR, fără merge) | Vercel construiește automat Preview-ul, în ~3 min | se șterge deployment-ul |
| C | Scoate ținta **Preview** de la `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY` (rămân pe Production; de preferat le marchezi tu Sensitive în dashboard) | Preview-urile nu mai primesc chei pe care nu le folosesc; V1 live neatins | se adaugă la loc ținta Preview |

| Variabilă | Valoare |
|---|---|
| `DIVERSIBEBE_V2_PREVIEW` | `1` |
| `V2_INVITE_CODE_HASHES` | din `preview-env.txt` |
| `V2_REVIEW_CODE_HASHES` | din `preview-env.txt` |
| `NEXT_PUBLIC_V2_SUPABASE_URL` | `https://smyimgvxlggggjeoajdo.supabase.co` (același proiect ca V1) |
| `NEXT_PUBLIC_V2_SUPABASE_ANON_KEY` | cheia publică `sb_publishable_…`, aceeași ca V1 |
| `NEXT_PUBLIC_V2_BACKEND_KIND` | `supabase-native` |

Nu e nevoie de chei secrete: V2 nu folosește cheia `service_role`.

## Faci tu (manual, în dashboard)

**1. Supabase → Authentication → URL Configuration → Redirect URLs.** Adaugi, păstrând ce există și fără să schimbi Site URL:

```text
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/cont
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/recuperare
```

Fără ele, revenirea după Google și linkul de recuperare duc la site-ul V1.

**2. Email (Resend Free, 0 lei).** Necesar pentru recuperarea parolei; nu și pentru login cu parolă sau Google.

1. Cont Resend → **Domains** → adaugi `diversibebe.com` și pui în DNS (la registrar) înregistrările afișate (SPF, DKIM). Fără domeniu verificat, Resend trimite doar către adresa ta.
2. Resend → **API Keys** → o cheie nouă, „Sending access”. Nu o trimite agentului.
3. Supabase → Authentication → **SMTP Settings**: host `smtp.resend.com`, port `465`, user `resend`, parola = cheia, expeditor `noreply@diversibebe.com`, nume `DiversiBebe`.
4. Rate Limits → emailuri: 30/oră. Șablonul „Reset Password” în română: `AUTH-SETUP.md` §3.

**3. Google.** Nimic de schimbat: callback-ul rămâne cel Supabase, iar revenirea în Preview folosește Redirect URLs de la pasul 1.

**4. Pe iPhone.** Te conectezi o dată în Vercel în Safari, deschizi adresa și introduci codul din `preview-access-codes.txt`.

## Când se poate deschide

Imediat după A + B (~5 minute) și pasul 1:
- **merg:** navigarea ca vizitator, login cu email și parolă, Google, copiii și istoricul din V1, sincronizarea între dispozitive;
- **după pasul 2:** recuperarea parolei.

După deschidere, agentul verifică adresa (cu acces Vercel), erorile din Vercel și Supabase, și izolarea.

## Înapoi

Ștergi deployment-ul Preview sau variabilele Preview. Production și V1 nu sunt atinse în niciun pas.
