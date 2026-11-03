// Trust copy that depends on the content gate: in a live build every visible recipe has a signed
// specialist review, so "în curs de revizie" would be false; in preview it is the honest label.
import { contentMode } from "../catalog";

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
