export function isLocalDemoEnvironment(
  flag: string | undefined,
  provider: string | undefined,
  origin: string | undefined,
): boolean {
  if (flag !== "1" || !provider || !origin) return false;
  try {
    const p = new URL(provider),
      a = new URL(origin);
    return (
      p.origin === "http://127.0.0.1:54325" &&
      a.origin === "http://127.0.0.1:3100" &&
      p.pathname === "/" &&
      a.pathname === "/"
    );
  } catch {
    return false;
  }
}
