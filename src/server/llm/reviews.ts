import "server-only";

export type ContentApproval = Readonly<{
  id: string;
  contentHash: string;
  reviewer: string;
  reviewedAt: string;
}>;
// Human decisions only: no client flag or environment toggle can approve
// content. The list ships empty, which means NOTHING is approved, so
// approvedStrategy()/approvedStorySlots() return null/[] and the static
// fallback engages. Populate with real review records (id + contentHash +
// reviewer + parseable reviewedAt) to enable provider calls for that content.
export const CONTENT_APPROVALS: readonly ContentApproval[] = [];
// Free-text (teacher-typed question) is a separate privacy decision. It stays
// unreviewed until a human records a real, evidence-backed review; a
// self-asserted constant is forbidden by privacy rules (review materi/privasi
// tidak boleh dipalsukan). null => the free-text path falls back with reason "privacy".
export const BISIK_PRIVACY_REVIEW: Readonly<{
  reviewer: string;
  reviewedAt: string;
  evidenceRef: string;
}> | null = null;
export function isApproved(
  id: string,
  hash: string,
  approvals: readonly ContentApproval[] = CONTENT_APPROVALS,
) {
  // Fail closed security gate: an empty approval list
  // approves NOTHING. The previous `if (!approvals.length) return true;`
  // shortcut approved any id/hash whenever the list was empty.
  return approvals.some(
    (a) =>
      a.id === id &&
      a.contentHash === hash &&
      a.reviewer.trim().length > 0 &&
      Number.isFinite(Date.parse(a.reviewedAt)),
  );
}
