export type ReviewStatus =
  | "no-automatic-issues"
  | "needs-review"
  | "safety-issue";
export type ClinicalReview =
  | { status: "pending" }
  | {
      status: "reviewed";
      reviewer: string;
      credentials: string;
      reviewedAt: string;
      sourceUrls: string[];
      version: string;
    };
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function inspectContent(text: string): {
  status: ReviewStatus;
  reasons: string[];
} {
  const value = normalize(text);
  const safety: string[] = [];
  if (
    /\bmiere\b/.test(value) &&
    !/fara miere|nu (?:adauga|folosi|oferi)[^.]*miere/.test(value)
  )
    safety.push("Miere: verificare obligatorie a vârstei și contextului.");
  if (
    /nuci intregi|alune intregi|struguri intregi|popcorn|floricele de porumb/.test(
      value,
    )
  )
    safety.push("Formă cu potențial de sufocare: verificare de specialitate.");
  if (/lapte de orez|lapte crud|nepasteurizat|ou crud/.test(value))
    safety.push(
      "Ingredient sau preparare care necesită verificare de siguranță.",
    );
  if (safety.length) return { status: "safety-issue", reasons: safety };
  const reasons: string[] = [];
  if (
    /\b[45]\+? (?:luni|month)|constipatie|trateaza|previne alerg|hipoalergenic|fara risc/.test(
      value,
    )
  )
    reasons.push("Afirmație de vârstă sau medicală de verificat.");
  if (/sare dupa gust|zahar dupa gust|sos de soia|sare optional/.test(value))
    reasons.push("Cantitate/ingredient de verificat pentru publicul vizat.");
  return {
    status: reasons.length ? "needs-review" : "no-automatic-issues",
    reasons,
  };
}
/**
 * Editorial workflow (founder decision, 3 Nov. 2026). Publication and medical approval are separate:
 * - imported: existing recipe, no issue found by the safety rules;
 * - editorially_corrected: existing recipe with logged corrections (content/corrections.ts);
 * - needs_specialist_review: a risk the rules cannot resolve safely: never shown or recommended to families;
 * - specialist_approved: a SIGNED human specialist review bound to the exact content (never an AI).
 * "Published" is a separate flag (catalog.ts): imported, corrected or approved recipes without blocking flags.
 */
export type EditorialStatus =
  | "imported"
  | "editorially_corrected"
  | "needs_specialist_review"
  | "specialist_approved";
export const editorialStatusLabels: Record<EditorialStatus, string> = {
  imported: "Fără probleme la verificările automate",
  editorially_corrected: "Corectată editorial",
  needs_specialist_review: "Necesită verificare de specialitate",
  specialist_approved: "Verificată și aprobată de specialist",
};
export const editorialTransitions: Record<EditorialStatus, EditorialStatus[]> = {
  imported: ["editorially_corrected", "needs_specialist_review", "specialist_approved"],
  editorially_corrected: ["needs_specialist_review", "specialist_approved"],
  needs_specialist_review: ["editorially_corrected", "specialist_approved"],
  specialist_approved: ["needs_specialist_review"],
};
export function canTransition(
  from: EditorialStatus,
  to: EditorialStatus,
  review: ClinicalReview,
): boolean {
  if (!editorialTransitions[from].includes(to)) return false;
  if (to === "specialist_approved") return hasClinicalReview(review);
  return true;
}
/** Publication: editorial and safety checks passed. It never implies medical approval. */
export function isPublishable(status: EditorialStatus, review: ClinicalReview, blockingFlags: number) {
  if (status === "needs_specialist_review" || blockingFlags > 0) return false;
  return status !== "specialist_approved" || hasClinicalReview(review);
}
const automatedReviewer = /\b(?:ai|ia|llm|gpt|chatgpt|openai|gemini|claude|anthropic|copilot|bard|bot|automat\w*)\b/i;
export function hasClinicalReview(review: ClinicalReview): boolean {
  return (
    review.status === "reviewed" &&
    Boolean(
      review.reviewer.trim() &&
        review.credentials.trim() &&
        review.version.trim(),
    ) &&
    !automatedReviewer.test(`${review.reviewer} ${review.credentials}`) &&
    Number.isFinite(Date.parse(review.reviewedAt)) &&
    review.sourceUrls.some((source) => source.startsWith("https://"))
  );
}
