export function diagnosticDatabase(
  env?: Record<string, string | undefined>,
): URL;
export function verifyDiagnosticDatabase(
  env?: Record<string, string | undefined>,
): URL;
export function writeDiagnostic(
  name: string,
  value: unknown,
  env?: Record<string, string | undefined>,
): Promise<void>;
