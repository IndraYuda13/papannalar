import { describe, expect, it } from "vitest";
import { studentDtoSchema, serializeStudent } from "../../src/contracts/api";
import {
  boardPublicStateSchema,
  serializeBoardState,
} from "../../src/contracts/board";
import {
  classLimitsSchema,
  studentRefSchema,
} from "../../src/contracts/domain";
import {
  enrichmentReferenceSchema,
  serializeEnrichmentReference,
} from "../../src/contracts/llm";
import {
  diagnosticDtoSchema,
  serializeDiagnostic,
} from "../../src/contracts/telemetry";
import { createNameRepository } from "../../src/local/names";

const id = "cc26eac6-8dab-4453-a7d0-8d694f5cb414";
const classId = "a53b5a1d-d1a3-4cbe-a14f-00f2df1e32ed";
const student = { id, classId, attendanceNumber: 7, active: true };
const canary = "LOCAL_ONLY_CANARY";

describe("Allowlist DTO dan pemisahan identitas", () => {
  it("domain tidak membutuhkan nama; serializer hanya memetakan field yang disetujui", () => {
    expect(studentRefSchema.parse(student)).toEqual(student);
    const enriched = {
      ...student,
      name: canary,
      nickname: canary,
      displayName: canary,
      local: { guardian: canary },
      futureField: canary,
      toJSON: () => ({ leaked: canary }),
    };
    const json = serializeStudent(enriched);
    expect(JSON.parse(json)).toEqual({ schemaVersion: 1, ...student });
    expect(json).not.toContain(canary);
  });

  it.each([
    "name",
    "nickname",
    "displayName",
    "namaPanggilan",
    "unplannedField",
  ])("schema input menolak extra field %s (bukan blacklist)", (field) => {
    expect(
      studentDtoSchema.safeParse({
        schemaVersion: 1,
        ...student,
        [field]: canary,
      }).success,
    ).toBe(false);
    expect(
      studentRefSchema.safeParse({ ...student, [field]: canary }).success,
    ).toBe(false);
  });

  it("projection papan tidak mengirim nama, level, mastery, kunci, skor atau UUID siswa", () => {
    const privateGroup = {
      id,
      label: "Segitiga Biru" as const,
      attendanceNumbers: [1, 7],
      studentIds: [id],
      name: canary,
      level: "D1",
      activityStep: "D1",
      mastery: 0.9,
      answerKey: "A",
      score: 100,
      rank: 1,
      nested: { displayName: canary },
    };
    const input = {
      groups: [privateGroup],
      teacherState: { displayName: canary },
    };
    expect(JSON.parse(serializeBoardState(input))).toEqual({
      schemaVersion: 1,
      groups: [{ id, label: "Segitiga Biru", attendanceNumbers: [1, 7] }],
    });
    expect(
      boardPublicStateSchema.safeParse({
        schemaVersion: 1,
        groups: [privateGroup],
      }).success,
    ).toBe(false);
  });

  it("label grup publik bukan tempat teks/nama bebas", () => {
    expect(
      boardPublicStateSchema.safeParse({
        schemaVersion: 1,
        groups: [{ id, label: canary, attendanceNumbers: [1] }],
      }).success,
    ).toBe(false);
  });

  it("LLM reference tidak memuat identitas individu atau teks bebas", () => {
    const input = {
      schemaVersion: 1 as const,
      packageId: id,
      contentVersion: "1.0.0",
      studentId: id,
      attendanceNumber: 7,
      prompt: canary,
      nickname: canary,
    };
    expect(JSON.parse(serializeEnrichmentReference(input))).toEqual({
      schemaVersion: 1,
      packageId: id,
      contentVersion: "1.0.0",
    });
    expect(enrichmentReferenceSchema.safeParse(input).success).toBe(false);
  });

  it("diagnostik hanya kode, feature, bucket dan versi; tidak membawa raw error", () => {
    const allowed = {
      schemaVersion: 1 as const,
      code: "LOCAL_STORAGE_UNAVAILABLE" as const,
      feature: "storage" as const,
      durationBucket: "under-1s" as const,
      buildVersion: "0.1.0",
    };
    const input = {
      ...allowed,
      rawError: new Error(canary),
      payload: student,
      nickname: canary,
    };
    expect(JSON.parse(serializeDiagnostic(input))).toEqual(allowed);
    expect(diagnosticDtoSchema.safeParse(input).success).toBe(false);
    expect(
      diagnosticDtoSchema.safeParse({ ...allowed, code: canary }).success,
    ).toBe(false);
  });

  it.each([0, 41, 1.5, "7"])(
    "menolak absen tidak valid %s",
    (attendanceNumber) => {
      expect(
        studentRefSchema.safeParse({ ...student, attendanceNumber }).success,
      ).toBe(false);
    },
  );

  it("menolak nama di field ID dan tidak memasukkannya ke pesan error", () => {
    expect(() => serializeStudent({ ...student, id: canary })).toThrow(
      "Invalid boundary data",
    );
    expect(() => serializeStudent({ ...student, id: canary })).not.toThrow(
      canary,
    );
  });

  it.each([
    { grade: 0, count: 32 },
    { grade: 13, count: 32 },
    { grade: 7, count: 0 },
    { grade: 7, count: 41 },
  ])("validasi batas kelas %j", (input) => {
    expect(classLimitsSchema.safeParse(input).success).toBe(false);
  });

  it("menerima grade 1-12/count 1-40 pada batas inklusif", () => {
    expect(classLimitsSchema.parse({ grade: 1, count: 1 })).toEqual({
      grade: 1,
      count: 1,
    });
    expect(classLimitsSchema.parse({ grade: 12, count: 40 })).toEqual({
      grade: 12,
      count: 40,
    });
  });

  it("import repository aman di SSR; membuka storage di luar browser ditolak", () => {
    expect(() => createNameRepository({ ownerId: id, mode: "demo" })).toThrow(
      "Local storage unavailable",
    );
  });
});
