import { it, expect } from "vitest";
import { toPrintAssignment } from "../../src/core/library/print-assignment";
import { runV2Schema } from "../../src/contracts/library";
it("prints snapshot order and exact form without keys/names/roster", () => {
  const id = "b0000000-0000-4000-8000-000000000001";
  const run = runV2Schema.parse({
    id,
    classId: id,
    classLabel: "7A",
    collectionId: id,
    version: 1,
    date: "2026-10-13",
    mode: "teach",
    responseMethod: "cards",
    mapping: { default: null, overrides: [] },
    parentLessonId: id,
    assignmentId: id,
    status: "active",
    position: 0,
    revision: 1,
    formId: id,
    roster: [{ id, attendanceNumber: 1 }],
    synthetic: false,
    document: {
      title: "Bilangan",
      kind: "cards",
      items: [
        {
          id,
          kind: "card",
          prompt: "2+3",
          options: ["5", "4", "3", "2"],
          key: "A",
          explanation: "Secret explanation",
        },
      ],
    },
  });
  const printed = toPrintAssignment(run);
  expect(printed.items[0].options).toEqual(
    run.document.items[0].kind === "card" ? run.document.items[0].options : [],
  );
  expect(printed.binding.formId).toBe(run.formId);
  expect(printed).not.toHaveProperty("roster");
  expect(printed.items[0]).not.toHaveProperty("key");
  expect(JSON.stringify(printed)).not.toContain("Secret explanation");
  expect(() => toPrintAssignment({ ...run, responseMethod: "none" })).toThrow();
});
