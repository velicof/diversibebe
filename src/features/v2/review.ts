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
export function hasClinicalReview(review: ClinicalReview): boolean {
  return (
    review.status === "reviewed" &&
    Boolean(
      review.reviewer.trim() &&
        review.credentials.trim() &&
        review.version.trim(),
    ) &&
    Number.isFinite(Date.parse(review.reviewedAt)) &&
    review.sourceUrls.some((source) => source.startsWith("https://"))
  );
}
