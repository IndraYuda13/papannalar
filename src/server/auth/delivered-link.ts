import "server-only";
/** Retained import compatibility; password authentication never reveals links. */
export async function deliveredLoginLink(
  email: string,
): Promise<string | null> {
  void email;
  return null;
}
