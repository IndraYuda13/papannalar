import { describe, expect, it } from "vitest";
import {
  isSameOrigin,
  isTeacherIdentity,
  loginSchema,
} from "../../src/contracts/auth";
import {
  createClassSchema,
  serializeCreateClass,
  serializeUpdateClass,
} from "../../src/contracts/classes";

const id = "12345678-1234-4234-8234-123456789012";
describe("Auth/ownership boundaries", () => {
  it("hanya identitas permanen terverifikasi memenuhi peran guru", () => {
    expect(
      isTeacherIdentity({
        id,
        email: "teacher@qa.invalid",
        is_anonymous: false,
      }),
    ).toBe(true);
  });
  it.each([
    null,
    {},
    { id, is_anonymous: true },
    { id, email: "teacher@qa.invalid" },
    { id, is_anonymous: false },
    { id: "invalid", email: "teacher@qa.invalid", is_anonymous: false },
  ])("identitas tidak lengkap/anon ditolak: %j", (user) => {
    expect(isTeacherIdentity(user)).toBe(false);
  });
  it.each([null, "https://evil.invalid", "null"])(
    "Origin %s tidak boleh memutasi cookie/data",
    (origin) => {
      const headers = new Headers(origin ? { origin } : {});
      expect(
        isSameOrigin({ url: "http://127.0.0.1:3000/auth/login", headers }),
      ).toBe(false);
    },
  );
  it("origin eksplisit mengatasi hostname internal reverse proxy tanpa wildcard", () => {
    expect(
      isSameOrigin(
        {
          url: "http://localhost:3100/auth/login",
          headers: new Headers({ origin: "http://127.0.0.1:3100" }),
        },
        "http://127.0.0.1:3100",
      ),
    ).toBe(true);
  });
  it("login menolak extra role/redirect/metadata", () => {
    expect(
      loginSchema.safeParse({ email: "teacher@qa.invalid", role: "admin" })
        .success,
    ).toBe(false);
  });
  it("create class serializer tidak membawa owner/name/student object", () => {
    const input = {
      id,
      label: "7B",
      grade: 7,
      count: 32,
      mode: "pilot" as const,
      ownerId: id,
      nickname: "CANARY",
      students: [{ name: "CANARY" }],
    };
    expect(JSON.parse(serializeCreateClass(input))).toEqual({
      id,
      label: "7B",
      grade: 7,
      count: 32,
      mode: "pilot",
    });
    expect(createClassSchema.safeParse(input).success).toBe(false);
  });
  it("update tidak dapat mengganti ownership, mode atau roster count", () => {
    expect(
      JSON.parse(
        serializeUpdateClass({
          label: "7C",
          grade: 7,
          revision: 1,
          ...{ ownerId: id, mode: "demo", count: 40 },
        }),
      ),
    ).toEqual({ label: "7C", grade: 7, revision: 1 });
  });
});
