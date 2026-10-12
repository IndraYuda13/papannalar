import { it, expect } from "vitest";
import { loginSchema, enrollPasswordSchema } from "../../src/contracts/auth";
it("requires conventional password and rejects legacy email-only/private extras", () => {
  expect(loginSchema.safeParse({ email: "test@qa.invalid" }).success).toBe(
    false,
  );
  expect(
    loginSchema.parse({
      email: " TEST@qa.invalid ",
      password: "synthetic-test-password",
    }).email,
  ).toBe("test@qa.invalid");
  for (const password of ["", "        ", "short", "x".repeat(129)])
    expect(
      loginSchema.safeParse({ email: "test@qa.invalid", password }).success,
    ).toBe(false);
  expect(
    enrollPasswordSchema.safeParse({
      password: "synthetic-test-password",
      email: "other@qa.invalid",
    }).success,
  ).toBe(false);
});
