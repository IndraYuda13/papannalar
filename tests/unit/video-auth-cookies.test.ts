import { expect, it } from "vitest";
import { isSurfaceAuthCookie } from "../../src/server/auth/cookies";
it.each([
  "",
  ".0",
  ".12",
  "-code-verifier",
  "-flows-code-verifier",
  "-flows-code-verifier.0",
  "-flow-5188c02c3b7dc399322f6b503ac7642a-code-verifier",
  "-flow-abcdefgh-code-verifier.2",
])("recognizes only this surface's session/PKCE cookie family %s", (suffix) => {
  expect(
    isSurfaceAuthCookie("pn-teacher-auth" + suffix, "pn-teacher-auth"),
  ).toBe(true);
  expect(isSurfaceAuthCookie("pn-board-auth" + suffix, "pn-teacher-auth")).toBe(
    false,
  );
});
it.each([
  "-admin-key",
  "-flow-short-code-verifier",
  "-flow-" + "x".repeat(65) + "-code-verifier",
  ".secret",
  "-flows-code-verifier.bad",
  "x.0",
])("rejects unrelated/lookalike cookies %s", (suffix) => {
  expect(
    isSurfaceAuthCookie("pn-teacher-auth" + suffix, "pn-teacher-auth"),
  ).toBe(false);
});
