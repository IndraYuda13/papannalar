import "server-only";

export type ContentApproval = Readonly<{
  id: string;
  contentHash: string;
  reviewer: string;
  reviewedAt: string;
}>;
// Human decisions only: no client flag or environment toggle can approve content.
export const CONTENT_APPROVALS: readonly ContentApproval[] = [];
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
  return approvals.some(
    (a) =>
      a.id === id &&
      a.contentHash === hash &&
      a.reviewer.trim().length > 0 &&
      Number.isFinite(Date.parse(a.reviewedAt)),
  );
}
