import { describe, expect, it } from "vitest";
import { teacherSectionForPath } from "../../src/features/guru/workspace-navigation";
import { findCollections } from "../../src/features/library/discovery";

describe("workspace navigation keeps the parent selected during a task", () => {
  it.each([
    ["/guru", "/guru"],
    ["/guru/mulai", "/guru"],
    ["/guru/sesi/123", "/guru"],
    ["/guru/latihan", "/guru/latihan"],
    ["/guru/simulasi", "/guru/latihan"],
    ["/guru/kelas/123", "/guru/kelas"],
    ["/guru/soal/baru", "/guru/soal"],
    ["/guru/hasil/123", "/guru/asesmen"],
    ["/guru/akun", null],
  ])("%s belongs to %s", (pathname, parent) => {
    expect(teacherSectionForPath(pathname)).toBe(parent);
  });
});

describe("material discovery respects the selected source and archival state", () => {
  const collections = [
    {
      id: "a",
      source: "system",
      status: "ready",
      document: { title: "Operasi Pecahan", kind: "cards" },
    },
    {
      id: "b",
      source: "teacher",
      status: "draft",
      document: { title: "Lift dan Bilangan", kind: "interactive" },
    },
    {
      id: "c",
      source: "teacher",
      status: "archived",
      document: { title: "Pecahan lama", kind: "cards" },
    },
  ] as const;
  it("finds Indonesian titles without case or surrounding-space sensitivity", () => {
    expect(
      findCollections(collections, "system", "  PECAHAN ").map((c) => c.id),
    ).toEqual(["a"]);
  });
  it("never exposes archived or other-source materials", () => {
    expect(findCollections(collections, "teacher", "pecahan")).toEqual([]);
    expect(
      findCollections(collections, "teacher", "").map((c) => c.id),
    ).toEqual(["b"]);
  });
  it("can find materials by their visible activity type", () => {
    expect(
      findCollections(collections, "system", "kartu").map((c) => c.id),
    ).toEqual(["a"]);
    expect(
      findCollections(collections, "teacher", "interaktif").map((c) => c.id),
    ).toEqual(["b"]);
  });
  it("searches both sources from the global search without showing archives", () => {
    expect(findCollections(collections, "all", "").map((c) => c.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
