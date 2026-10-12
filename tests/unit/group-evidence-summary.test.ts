import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GroupEvidenceSummary } from "../../src/features/guru/group-evidence-summary";
import { evidenceReasonCopy } from "../../src/features/guru/evidence-copy";
import type { GroupLesson } from "../../src/contracts/group-lesson";
const lesson: GroupLesson = {
  schemaVersion: 1,
  id: crypto.randomUUID(),
  classId: crypto.randomUUID(),
  classLabel: "Uji",
  date: "2026-10-13",
  revision: 1,
  status: "draft",
  synthetic: false,
  competency: null,
  seed: "test",
  groupingSource: "random",
  presence: [],
  absentStudentIds: [],
  evidenceSnapshot: [],
  groups: [],
  assignments: [],
  assessmentRevision: 0,
};
it.each(["no_result", "unmapped", "incomplete", "not_comparable"] as const)(
  "renders honest aggregate and pupil copy for %s",
  (reason) => {
    const studentId = crypto.randomUUID();
    const html = renderToStaticMarkup(
      createElement(GroupEvidenceSummary, {
        lesson: {
          ...lesson,
          presence: [{ id: studentId, attendanceNumber: 1 }],
          evidenceSnapshot: [
            { studentId, status: "unknown", reason, evidence: null },
          ],
        },
        groupCount: 1,
      }),
    );
    expect(html.split(evidenceReasonCopy[reason]).length - 1).toBe(2);
    if (reason !== "no_result")
      expect(html).not.toContain("Belum ada hasil untuk topik ini");
    expect(html).toContain("bukan tingkat kemampuan");
  },
);
it("keeps accepted same-form evidence coverage without unknown fallback", () => {
  const studentId = crypto.randomUUID();
  const html = renderToStaticMarkup(
    createElement(GroupEvidenceSummary, {
      lesson: {
        ...lesson,
        presence: [{ id: studentId, attendanceNumber: 1 }],
        evidenceSnapshot: [
          {
            studentId,
            status: "known",
            reason: "comparable",
            evidence: {
              source: "library_cards",
              runId: crypto.randomUUID(),
              collectionId: crypto.randomUUID(),
              version: 2,
              responseRevision: 1,
              assessedAt: "2026-10-13",
              competencyId: "pecahan",
              comparisonKey: "form",
              itemIds: [crypto.randomUUID()],
              correct: 1,
              total: 1,
            },
          },
        ],
      },
      groupCount: 1,
    }),
  );
  expect(html).toContain("1/1 soal");
  expect(html).not.toContain("Belum ada hasil");
});
