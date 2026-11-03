# Supabase Auth pentru V1 + V2 (un singur proiect) — setări exacte

Le faci tu în Supabase Dashboard → Authentication, în etapa 5 din `MIGRATION-V1-V2.md`, **după** patch-ul V1 și migrații. Cost: 0 lei.

## Ce folosesc azi V1 și V2

| Flux | V1 (producție) | V2 |
|---|---|---|
| Email + parolă | `signUp`, sesiune imediată (confirmarea emailului este **dezactivată**) | identic |
| Google | `signInWithOAuth` → `/auth/callback` | `signInWithOAuth` → `/v2/cont` (PKCE) |
| Parolă uitată | **nefuncțional**: paginile `/forgot-password/*` sunt doar interfață și nu apelează nimic. Utilizatorii V1 nu își pot reseta parola azi | `resetPasswordForEmail` → email → `/v2/recuperare` |
| Email de verificare custom | `/api/send-verification`, retras în patch (releu deschis) | — |

## 1. URL Configuration

- **Site URL:** `https://www.diversibebe.com`. Verifică doar; probabil e deja setat.
- **Redirect URLs.** Adaugă, păstrând ce există:

```text
https://www.diversibebe.com/auth/callback
https://www.diversibebe.com/v2/cont
https://www.diversibebe.com/v2/recuperare
```

Fără wildcard-uri largi și fără adrese de Preview: Preview-ul rulează V2 fără conturi.

## 2. Email (SMTP propriu, Resend Free)

Emailul implicit Supabase trimite doar câteva mesaje pe oră. Fără SMTP propriu, recuperarea parolei nu e de încredere.

| Câmp | Valoare |
|---|---|
| Enable Custom SMTP | da |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | o cheie Resend **nouă**, creată doar pentru SMTP. O introduci tu, nu ajunge în repository și nici la agent |
| Sender email | `no-reply@diversibebe.com`. Domeniul trebuie verificat în Resend; dacă nu e, Resend îți dă înregistrările DNS |
| Sender name | `DiversiBebe` |

Resend Free: 3.000 de emailuri pe lună, 100 pe zi. După SMTP, în Rate Limits poți ridica limita de emailuri, de exemplu la 30/oră.

**Confirm email rămâne DEZACTIVAT.** V1 creează profilul copilului imediat după `signUp`; cu confirmarea activă, înregistrările noi din V1 ar rămâne fără copil (`MIGRATION-V1-V2.md` §6).

## 3. Șablonul „Reset Password” (în română)

Authentication → Email Templates → Reset Password.

**Subject:**

```text
Resetează parola contului DiversiBebe
```

**Body (HTML):**

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#302b27">
  <h2 style="font-weight:600">Resetează parola</h2>
  <p>Ai cerut o parolă nouă pentru contul DiversiBebe asociat adresei {{ .Email }}.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;background:#a14b2d;color:#fff;border-radius:10px;text-decoration:none">Alege o parolă nouă</a></p>
  <p style="font-size:13px;color:#71675e">Deschide linkul în același browser în care ai cerut resetarea. Linkul poate fi folosit o singură dată.</p>
  <p style="font-size:13px;color:#71675e">Dacă nu ai cerut tu resetarea, ignoră acest mesaj: parola rămâne neschimbată.</p>
</div>
```

`{{ .ConfirmationURL }}` include adresa de revenire cerută de aplicație (`/v2/recuperare`), validată de lista de Redirect URLs.

## 4. Google

Providerul Google este deja activ (65 de conturi îl folosesc). Nu se schimbă nimic în Google Cloud: adresa de callback rămâne cea a Supabase. Este nevoie doar de `https://www.diversibebe.com/v2/cont` în Redirect URLs (punctul 1).

## 5. Verificare (în canary, cu contul tău)

1. `/v2/cont` → „Am uitat parola” → emailul vine de la `no-reply@diversibebe.com`, în română → linkul deschide `/v2/recuperare` → parola nouă funcționează și în V1.
2. „Continuă cu Google” → revii în `/v2/cont`, apoi în `/v2/azi`, cu copiii din V1.
3. Înregistrare nouă în V1: copilul este creat (confirmarea a rămas dezactivată).

## Backlog V1

„Parolă uitată” în V1 (paginile `/forgot-password/*`) se poate lega la același flux Supabase (`resetPasswordForEmail` + pagina de parolă nouă) sau înlocui cu un link către `/v2/cont`. Efort: 1–2 h. Recomandare: link către V2 după lansare.
