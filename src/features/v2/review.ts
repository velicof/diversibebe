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
/** Editorial workflow. Only a documented review by a qualified specialist unlocks the last two states. */
export type EditorialStatus =
  | "draft"
  | "review_required"
  | "clinically_approved"
  | "published";
export const editorialTransitions: Record<EditorialStatus, EditorialStatus[]> = {
  draft: ["review_required"],
  review_required: ["draft", "clinically_approved"],
  clinically_approved: ["published", "review_required"],
  published: ["review_required"],
};
export function canTransition(
  from: EditorialStatus,
  to: EditorialStatus,
  review: ClinicalReview,
): boolean {
  if (!editorialTransitions[from].includes(to)) return false;
  if (to === "clinically_approved" || to === "published")
    return hasClinicalReview(review);
  return true;
}
/** A recipe is shown to real families only when published AND clinically reviewed. */
export function isPublishable(status: EditorialStatus, review: ClinicalReview) {
  return status === "published" && hasClinicalReview(review);
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
