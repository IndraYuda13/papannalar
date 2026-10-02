import { z } from "zod";
import { randomIdSchema } from "./domain";

export const loginSchema = z.strictObject({ email: z.email().max(254) });
export const teacherIdentitySchema = z.strictObject({
  id: randomIdSchema,
  role: z.literal("teacher"),
});
export const boardIdentitySchema = z.strictObject({
  id: randomIdSchema,
  role: z.literal("board"),
});

export function isTeacherIdentity(
  user: { id?: string; is_anonymous?: boolean; email?: string } | null,
): boolean {
  return (
    !!user &&
    user.is_anonymous === false &&
    !!user.email &&
    randomIdSchema.safeParse(user.id).success
  );
}

export function isSameOrigin(
  request: {
    url: string;
    headers: Headers;
  },
  expectedOrigin = new URL(request.url).origin,
): boolean {
  return request.headers.get("origin") === expectedOrigin;
}
