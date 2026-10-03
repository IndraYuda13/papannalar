// Only these public reasons may cross the local-storage privacy boundary.
// Database exceptions and record contents still use LocalStorageError.
export type LocalActionCode =
  | "ACTIVE_SESSION"
  | "FINISH_PREVIOUS"
  | "PACKAGE_USED"
  | "NEXT_CHECK_REQUIRED"
  | "CLASS_CHANGED"
  | "NO_STUDENTS"
  | "CHECK_NOT_SUPPORTED"
  | "SEPARATE_HISTORY";

export class LocalActionError extends Error {
  constructor(public readonly code: LocalActionCode) {
    super(code);
    this.name = "LocalActionError";
  }
}
