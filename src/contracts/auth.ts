import { z } from "zod";
import { randomIdSchema } from "./domain";

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((v) => v.trim().length > 0);
export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: passwordSchema,
});
export const registerSchema = loginSchema;
export const enrollPasswordSchema = z.strictObject({
  password: passwordSchema,
});
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
  expectedOrigin: string | readonly string[] = new URL(request.url).origin,
): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  return (
    Array.isArray(expectedOrigin) ? expectedOrigin : [expectedOrigin]
  ).includes(origin);
}
