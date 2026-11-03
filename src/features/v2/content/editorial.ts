// Editorial decisions recorded from a SIGNED specialist review (docs/ai-ops/REVIEW-PACKAGE.md).
// Only a human pediatrician or registered dietitian can add an entry here; an AI evaluation never can
// (hasClinicalReview rejects AI reviewers). An entry is required for any status after review_required.
import type { ClinicalReview, EditorialStatus } from "../review";

export type EditorialRecord = { status: EditorialStatus; review: ClinicalReview };

export const editorialRegistry: Record<string, EditorialRecord> = {};
