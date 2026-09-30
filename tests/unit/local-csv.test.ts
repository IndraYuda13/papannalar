import { describe, expect, it } from "vitest";
import { parseLocalRosterCsv } from "../../src/features/guru/local-csv";
import { seededGroupId } from "../../src/core/math/seed";
const roster = Array.from({ length: 40 }, (_, i) => ({
  schemaVersion: 1 as const,
  id: seededGroupId(987, i),
  classId: seededGroupId(1, 0),
  attendanceNumber: i + 1,
  active: true,
}));
describe("C01 local CSV identity boundary", () => {
  it("maps attendance to random IDs locally, accepts UTF8 BOM/quotes/empty deletion", () => {
    expect(
      parseLocalRosterCsv(
        '\uFEFFabsen,nama\r\n01,"PRIVATE, SENTINEL"\r\n02,\r\n',
        roster,
      ),
    ).toEqual([
      { studentId: roster[0].id, displayName: "PRIVATE, SENTINEL" },
      { studentId: roster[1].id, displayName: "" },
    ]);
    expect(
      parseLocalRosterCsv('absen,nama\n1,"PRIVATE ""SENTINEL"""', roster)[0]
        .displayName,
    ).toBe('PRIVATE "SENTINEL"');
  });
  it.each([
    "absen,nama\n1,X\n1,Y",
    "absen,nama\n41,X",
    "absen,nama\n0,X",
    "absen,nama\n1,X,extra",
    "absen,email\n1,X",
    'absen,nama\n1,"unterminated',
    "absen,nama\n1,X\n02,X\n02,Y",
    "absen,nama\n1," + "X".repeat(121),
    "X".repeat(100001),
  ])("rejects bad import atomically", (csv) => {
    expect(() => parseLocalRosterCsv(csv, roster)).toThrow();
  });
  it("accepts 1/32/40 entries and rejects inactive/unknown references", () => {
    for (const size of [1, 32, 40])
      expect(
        parseLocalRosterCsv(
          "absen,nama\n" +
            roster
              .slice(0, size)
              .map((s) => `${s.attendanceNumber},LOCAL_SENTINEL`)
              .join("\n"),
          roster,
        ),
      ).toHaveLength(size);
    expect(() =>
      parseLocalRosterCsv("absen,nama\n1,X", [{ ...roster[0], active: false }]),
    ).toThrow();
  });
});
