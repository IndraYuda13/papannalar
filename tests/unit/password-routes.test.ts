import { it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  requireTeacher: vi.fn(),
}));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({
    client: { rpc: mocks.rpc, auth: mocks },
    finish: (r: Response) => {
      r.headers.set("Cache-Control", "private, no-store");
      return r;
    },
  }),
  requireTeacher: mocks.requireTeacher,
}));
import { passwordAuth } from "../../src/server/auth/password";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  process.env.APP_ORIGIN = "http://127.0.0.1:3213";
});
const request = (body: unknown, origin = "http://127.0.0.1:3213") =>
  new NextRequest("http://127.0.0.1:3213/auth/register", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
it("native signup distinguishes confirmation without pretending email verified", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const r = await passwordAuth(
    request({ email: "a@qa.invalid", password: "synthetic-password" }),
    "register",
  );
  expect(await r.json()).toEqual({
    status: "confirmation_required",
    redirect: null,
    emailVerified: false,
  });
  expect(r.headers.get("Cache-Control")).toContain("no-store");
});
it("wrong/unregistered remains generic and foreign-origin never reaches auth", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: { status: 400, message: "secret provider detail" },
  });
  const r = await passwordAuth(
    request({ email: "a@qa.invalid", password: "synthetic-password" }),
    "login",
  );
  expect(r.status).toBe(401);
  expect(await r.json()).toEqual({ error: { code: "AUTH_FAILED" } });
  await passwordAuth(
    request(
      { email: "a@qa.invalid", password: "synthetic-password" },
      "https://foreign.invalid",
    ),
    "register",
  );
  expect(mocks.signUp).not.toHaveBeenCalled();
});
it("legacy enrollment requires authenticated teacher and never accepts alternate identity", async () => {
  mocks.requireTeacher.mockRejectedValue(new Error("UNAUTHENTICATED"));
  expect(
    (await passwordAuth(request({ password: "synthetic-password" }), "enroll"))
      .status,
  ).toBe(401);
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
