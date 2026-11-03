// Editorial corrections applied by V2 on top of the existing library (src/app/lib/recipesDatabase.ts stays
// untouched, so V1 and every user association keep working). Each change is a literal before → after with
// a reason and a public source. These are EDITORIAL corrections, not clinical approval.
import { SOURCES } from "./safety";

export type Correction = {
  recipeId: string;
  field: "ingredients" | "steps";
  before: string;
  /** Empty string removes the line. */
  after: string;
  reason: string;
  source: string;
};

const c = (recipeId: string, field: Correction["field"], before: string, after: string, reason: string, source: string): Correction => ({ recipeId, field, before, after, reason, source });
const ROUND = "Alimentele mici și rotunde se taie în jumătăți/sferturi sau se zdrobesc (risc de înec sub 5 ani).";

export const corrections: Correction[] = [
  c("mamaliga-branza-ou-12", "steps", "Fierbe ouăle ochi sau fierte tari.", "Fierbe ouăle tari sau fă ochiuri bine făcute, cu gălbenușul complet închegat.", "Ou gătit complet.", SOURCES.nhsAvoid),
  c("cereale-casa-nuci-fructe-10", "ingredients", "¼ cană semințe (floarea-soarelui, dovleac)", "¼ cană semințe măcinate fin (floarea-soarelui, dovleac)", "Semințele întregi sunt un risc de înec.", SOURCES.cdcChoking),
  c("cereale-casa-nuci-fructe-10", "steps", "Amestecă fulgii de ovăz cu nucile și semințele.", "Amestecă fulgii de ovăz cu nucile și semințele măcinate.", "Semințele întregi sunt un risc de înec.", SOURCES.cdcChoking),
  c("cartof-dulce-fasole-avocado", "ingredients", "¼ cană afine (opțional)", "¼ cană afine, zdrobite cu furculița (opțional)", ROUND, SOURCES.nhsAvoid),
  c("cartof-dulce-fasole-avocado", "steps", "Servește totul împreună cu afine pe lângă.", "Servește totul împreună cu afinele zdrobite pe lângă.", ROUND, SOURCES.nhsAvoid),
  c("clatite-clasice-fructe-12", "ingredients", "Fructe proaspete la alegere (căpșuni, banane, afine)", "Fructe proaspete la alegere (căpșuni, banane, afine tăiate în jumătăți)", ROUND, SOURCES.nhsAvoid),
  c("paine-perdue-fructe-12", "ingredients", "½ cană fructe (căpșuni, afine, banane)", "½ cană fructe (căpșuni, afine tăiate în jumătăți, banane)", ROUND, SOURCES.nhsAvoid),
  c("galuste-branza-dulci-12", "ingredients", "¼ cană fructe (afine, căpșuni)", "¼ cană fructe (afine tăiate în jumătăți, căpșuni)", ROUND, SOURCES.nhsAvoid),
  c("bol-acai-fructe-12", "ingredients", "¼ cană afine", "¼ cană afine, tăiate în jumătăți", ROUND, SOURCES.nhsAvoid),
  c("croissant-branza-rosii-12", "ingredients", "2 roșii cherry (sau ½ roșie normală)", "2 roșii cherry tăiate în sferturi (sau ½ roșie normală, tocată)", ROUND, SOURCES.nhsAvoid),
  c("supa-crema-dovlecel-morcov-12", "ingredients", "20g crutoane", "20g pâine moale, tăiată cubulețe", "Crutoanele tari sunt un risc de înec.", SOURCES.cdcChoking),
  c("supa-crema-dovlecel-morcov-12", "steps", "Servește cu semințe măcinate și crutoane.", "Servește cu semințe măcinate și cubulețe de pâine moale.", "Crutoanele tari sunt un risc de înec.", SOURCES.cdcChoking),
  c("supa-crema-broccoli-12", "steps", "Servește cu crutoane.", "Servește cu cubulețe de pâine moale.", "Crutoanele tari sunt un risc de înec.", SOURCES.cdcChoking),
  c("paste-pesto-pui", "ingredients", "1 lingură nuci sau migdale", "1 lingură nuci sau migdale, măcinate fin în pesto", "Nucile se servesc doar măcinate fin sub 5 ani.", SOURCES.nhsAvoid),
  c("paste-pesto-pui", "steps", "Pentru pesto: mixează busuiocul, usturoiul, uleiul, nucile și lămâia.", "Pentru pesto: mixează busuiocul, usturoiul, uleiul, nucile și lămâia până la o pastă fină, fără bucăți.", "Nucile se servesc doar măcinate fin sub 5 ani.", SOURCES.nhsAvoid),
  c("orez-pui-legume-asiatic", "ingredients", "1 linguriță sos de soia fără sare", "", "Sosul de soia are mult sodiu chiar în varianta „redusă”; preparatul rămâne aromat prin ceapă verde și ulei de susan.", SOURCES.nhsAvoid),
  c("orez-pui-legume-asiatic", "steps", "Stropește cu sos de soia. Servește călduț.", "Servește călduț.", "Sosul de soia are mult sodiu.", SOURCES.nhsAvoid),
  c("piure-avocado-banana-chia-10", "steps", "Adaugă semințele de chia și sucul de lămâie.", "Adaugă semințele de chia și sucul de lămâie, apoi lasă 10 minute să se hidrateze chia.", "Chia uscată se umflă; se servește hidratată.", SOURCES.cdcChoking),
];

/**
 * Recipes kept in the specialist queue: the safe answer cannot be supported from public guidance
 * with enough certainty, so they are visible to the founder and the reviewer, never to families.
 */
export const specialistQueue: Record<string, string> = {
  "pate-ficat-pui-pere": "Ficat de la 6 luni: frecvența și porția (vitamina A) trebuie stabilite de un specialist.",
  "ficatel-pui-piure-cartofi-12": "Ficat: frecvența și porția (vitamina A) trebuie stabilite de un specialist.",
};

/** V2 id → legacy id. Legacy ids stay valid for V1 favorites; V2 stores only ASCII ids. */
export const idAliases: Record<string, string> = { "omleta-legume-8": "omletă-legume-8" };
