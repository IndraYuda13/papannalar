export const databaseUrl: string;
export function sql(query: string): string;
export function literal(value: unknown): string;
export function asUser(
  user: { id: string; is_anonymous: boolean },
  query: string,
): unknown;
