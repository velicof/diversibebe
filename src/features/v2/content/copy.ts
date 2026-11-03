// Trust copy that depends on the content gate: in a live build every visible recipe has a signed
// specialist review, so "în curs de revizie" would be false; in preview it is the honest label.
import { contentMode } from "../catalog";
import { usesRealAccounts } from "../cloud/guard";

const live = contentMode === "live";

export const reviewCopy = {
  footer: live
    ? "Rețetele afișate au fost revizuite de un specialist pentru etapa indicată. Nu înlocuiesc sfatul medicului care cunoaște copilul."
    : "Aceste rețete provin din biblioteca existentă și așteaptă revizia unui specialist. Filtrele sunt demonstrative și nu confirmă siguranța pentru un copil.",
  homeFinePrint: live
    ? "Filtrul de timp ordonează ideile; etapa și siguranța sunt verificate înainte."
    : "Catalog demonstrativ, în curs de revizie clinică. Filtrul de timp nu confirmă că o rețetă este potrivită copilului tău.",
  homeTrust: live
    ? "Fiecare rețetă afișată are o revizie de specialitate documentată. Resursele despre pregătire și servire au sursa la vedere și rămân accesibile fără cont. Nu promitem recomandări medicale personalizate."
    : "Rețetele sunt exemple demonstrative, în curs de revizie. Resursele despre pregătire și servire au sursa la vedere și rămân accesibile fără cont. Nu promitem recomandări medicale personalizate.",
  serving: live
    ? "Forma de servire din fiecare rețetă a fost revizuită pentru etapa indicată. Pentru întrebări despre copilul tău, consultă"
    : "Instrucțiunile din catalog sunt demonstrative, în curs de revizie. Pentru servire sigură, consultă",
  planCount: (count: number) =>
    `${count} idei potrivite${live ? "" : " în catalogul demonstrativ"}. Siguranța și etapa sunt verificate înaintea preferințelor; sezonul doar ordonează ideile.`,
  recipeBadge: live ? "revizuită" : "în curs de revizie",
};

// Account wording follows the backend, not the content gate: on the shared production project these are
// the parents' real DiversiBebe accounts (same login as V1); on a loopback stack they are synthetic test accounts.
export const realAccounts = usesRealAccounts();
const pick = (real: string, test: string) => (realAccounts ? real : test);

export const accountCopy = {
  connectedEyebrow: pick("CONTUL TĂU", "MEDIU LOCAL IZOLAT"),
  connectedTitle: pick("Contul tău DiversiBebe", "Contul tău de test"),
  connectedIntro: pick(
    "Același cont ca în aplicația DiversiBebe: copiii, alimentele încercate și rețetele salvate se regăsesc în ambele versiuni.",
    "Date persistente pe serverul local. Fără legătură cu utilizatorii din producție.",
  ),
  connectedStatus: pick("Conectat", "Conectat în mediul de test"),
  signedOut: pick("Ai ieșit din cont.", "Ai ieșit din contul de test."),
  loginEyebrow: pick("CONTUL DIVERSIBEBE", "DOAR CONTURI SINTETICE"),
  loginTitle: pick("Conectează-te", "Conectează contul de test"),
  loginIntro: pick(
    "Folosește emailul și parola cu care intri deja în DiversiBebe. Copiii și istoricul tău rămân aceleași.",
    "Conexiunea acceptă exclusiv un server local izolat. Nu folosi datele unui cont real.",
  ),
  signupButton: pick("Creează un cont", "Creează un cont de test"),
  invalidForm: pick("Completează un email valid și parola.", "Completează un email valid și parola contului de test."),
  emailLabel: pick("Email", "Email de test"),
  passwordLabel: pick("Parola", "Parola contului de test"),
  submitLogin: pick("Conectare", "Conectare în test"),
  recoverNotice: pick(
    "Dacă adresa are un cont, vei primi un email cu linkul de resetare. Deschide-l în acest browser.",
    "Dacă adresa există, linkul apare în cutia poștală locală. Deschide linkul în acest browser.",
  ),
  unavailable: pick(
    "Conectarea este temporar indisponibilă. Explorarea fără cont rămâne funcțională.",
    "Conectarea este indisponibilă până la configurarea mediului local. Explorarea fără cont rămâne funcțională.",
  ),
  passwordNote: pick(
    "Parola nu este salvată de aplicație.",
    "Parola nu este salvată de aplicație. Sesiunea de autentificare este păstrată separat de datele demonstrative.",
  ),
  configError: pick("Conectarea la cont nu este disponibilă acum.", "Configurația de test nu este validă. Conexiunea a fost blocată."),
  loginFailed: pick(
    "Conectarea nu a reușit. Verifică emailul și parola.",
    "Conectarea nu a reușit. Verifică datele contului de test și conexiunea.",
  ),
  signupFailed: pick(
    "Contul nu a putut fi creat. Verifică adresa de email și parola (minimum 8 caractere).",
    "Contul nu a putut fi creat. Verifică adresa sintetică și parola (minimum 8 caractere).",
  ),
  googleButton: "Continuă cu Google",
  googleFailed: "Conectarea cu Google nu a reușit. Reîncearcă sau folosește emailul și parola.",
  saving: pick("Se salvează în cont…", "Se salvează în contul de test…"),
  synced: pick("Date sincronizate cu contul tău", "Date sincronizate cu mediul local de test"),
  accountLink: pick("Contul meu", "Contul de test"),
  connectLink: pick("Conectează-te", "Conectează contul de test"),
  savedInAccount: pick("Rezultatul și preferințele sunt păstrate în contul tău.", "Rezultatul și preferințele sunt păstrate în contul tău de test."),
  accountInvitation: pick(
    "Creează un cont sau conectează-te cu contul DiversiBebe pe care îl ai deja. Preferințele și ideile se vor salva în cont, pentru revenirea din alt browser.",
    "Creează un cont sintetic sau conectează-te. Preferințele și ideile se vor salva în cont, pentru revenirea din alt browser.",
  ),
  dataTitle: pick("Datele tale, cu minimum necesar.", "Un spațiu de test, cu date minime."),
  connectedData: pick(
    "Etapa, alimentele, planul și confirmările sunt păstrate pentru copilul selectat în contul tău. Favoritele sunt comune familiei. Le regăsești pe orice dispozitiv după conectare.",
    "Etapa, alimentele, planul și confirmările sunt păstrate pentru copilul selectat în baza de test. Favoritele sunt comune familiei. Datele se pot încărca pe un alt dispozitiv după conectare.",
  ),
  connectedPrivacy: pick(
    "Parola nu este păstrată în aplicație. Evenimentele folosirii nu includ nume, diagnostice sau identificatori ai copilului.",
    "Folosești un cont sintetic de test. Parola nu este păstrată în aplicație. Evenimentele folosirii nu includ nume, diagnostice sau identificatori ai copilului.",
  ),
  manageAccount: pick("Gestionează contul", "Gestionează contul de test"),
  guestResetConfirm: pick("Vei șterge doar alegerile păstrate în acest browser.", "Vei șterge doar alegerile din această versiune demonstrativă."),
  guestResetDone: pick("Datele din acest browser au fost șterse.", "Datele demonstrative au fost șterse."),
  guestResetButton: pick("Șterge datele din browser", "Șterge datele demo"),
  premiumInterest: pick(
    "Interesul a fost înregistrat în contul tău. Nu ai activat un abonament.",
    "Interesul a fost înregistrat în contul de test. Nu ai activat un abonament.",
  ),
  recoveryEyebrow: pick("RECUPERARE PAROLĂ", "RECUPERARE LOCALĂ"),
  pageTitle: pick("Contul tău", "Contul de test"),
  pageDescription: pick("Conectare la contul DiversiBebe.", "Conectare numai în mediul local izolat."),
};
