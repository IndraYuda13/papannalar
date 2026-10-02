import { describe, expect, it } from "vitest";
import { STEP_IDS, type StepId } from "../../src/content/ladder/registry";
import { CONTEXTS } from "../../src/content/contexts/registry";
import {
  canonicalAnswer,
  promptText,
} from "../../src/content/templates/format";
import { solveTemplate } from "../../src/content/templates/registry";
import type { GeneratedQuestion } from "../../src/content/templates/types";
import {
  parseTeacherPackage,
  toPublicPackage,
  toPublicQuestion,
} from "../../src/contracts/package";
import {
  fromSyncPackage,
  toSyncPackage,
} from "../../src/contracts/sync-package";
import { publicTool } from "../../src/contracts/tools";
import { generateQuestion } from "../../src/core/package/question";
import {
  buildPackage,
  freezePackage,
  prepareActivitySet,
  replacePackageQuestion,
} from "../../src/core/package/build";
import {
  activityToolSupport,
  questionTool,
} from "../../src/core/package/tool-task";
import {
  exitReasonCopy,
  withPublicExitReasons,
} from "../../src/core/package/exit-reasons";
import {
  independentQuestion,
  optionalQuestion,
  INDEPENDENT_TASK_LABELS,
} from "../../src/core/package/independent";
import { reflectionUsesForGroups } from "../../src/core/package/reflection";
import { applyPackageStories } from "../../src/core/package/enrichment";
import { seededGroupId } from "../../src/core/math/seed";
import { checkModel, exampleFrames } from "../../src/core/tools/patterns";

const input = {
  id: seededGroupId(551, 0),
  classId: seededGroupId(551, 1),
  grade: 7,
  variant: "weekly" as const,
  seed: 42,
  occupied: [
    { kind: "step" as const, stepId: "D1" as const },
    { kind: "step" as const, stepId: "D3" as const },
  ],
};

function sample(step: StepId, predicate: (q: GeneratedQuestion) => boolean) {
  for (let seed = 0; seed < 100; seed++) {
    const q = generateQuestion(step, seed);
    if (predicate(q)) return q;
  }
  throw new Error("No sample in bounded content seeds");
}

describe("V5 actual mathematical tool support", () => {
  it("C2 retains its KPK problem without pretending a displacement is a multiples model", () => {
    for (let seed = 0; seed < 32; seed++) {
      const q = generateQuestion("C2", seed),
        before = JSON.stringify(q);
      expect(questionTool(q)).toBeUndefined();
      expect(activityToolSupport([q])).toEqual({
        tool: null,
        interactiveSupport: "unavailable",
      });
      expect(promptText(q.prompt)).toContain(
        `KPK dari ${q.params.a} dan ${q.params.b}`,
      );
      expect(
        q.options.find((o) => o.label === q.answerKey)?.canonicalValue,
      ).toBe(canonicalAnswer(solveTemplate("C2", q.params)));
      expect(JSON.stringify(q)).toBe(before);
    }
  });

  it("A4 distinguishes a fraction of one whole from a fraction of a set", () => {
    const bar = sample("A4", (q) => !q.params.d);
    const set = sample("A4", (q) => Boolean(q.params.d));
    const task = questionTool(bar)!;
    expect(publicTool(task)).toMatchObject({
      kind: "fractions",
      operation: "represent",
      left: { numerator: bar.params.a, denominator: bar.params.b },
    });
    expect(checkModel(task, exampleFrames(task).at(-1)!)).toBe(true);
    expect(questionTool(set)).toBeUndefined();
    expect(activityToolSupport([bar, bar])).toEqual({
      tool: "fractions",
      interactiveSupport: "supported",
    });
    expect(activityToolSupport([bar, set])).toEqual({
      tool: null,
      interactiveSupport: "unavailable",
    });
    expect(activityToolSupport([])).toEqual({
      tool: null,
      interactiveSupport: "unavailable",
    });
  });

  it("checks actual partition limits, including a legacy fraction instance", () => {
    const q = sample("C3", () => true);
    expect(
      questionTool({ ...q, params: { a: 1, b: 5, c: 1, d: 4 } }),
    ).toBeUndefined();
    const legacy = generateQuestion("C3", 2, 1);
    expect(legacy.metadata.version).toBe("1.0.0");
    const task = questionTool(legacy);
    if (task) expect(publicTool(task).kind).toBe("fractions");
  });

  it("build and replacement recompute support from the selected board instances", () => {
    for (let seed = 0; seed < 16; seed++) {
      const pkg = buildPackage({
        ...input,
        grade: 2,
        variant: "oral",
        occupied: [],
        seed,
      });
      const set = pkg.activities.find((a) => a.stepId === "A4")!;
      expect(set.interactiveSupport === "supported").toBe(
        set.board.every((q) => !q.params.d),
      );
      const next = replacePackageQuestion(pkg, set.board[0].id, seed + 910);
      const updated = next.activities.find((a) => a.stepId === "A4")!;
      expect(updated.interactiveSupport === "supported").toBe(
        updated.board.every((q) => !q.params.d),
      );
      expect(parseTeacherPackage(next)).toEqual(next);
      expect(prepareActivitySet(updated)).toEqual(updated);
    }
  });
});

describe("V5 authored exit reasons", () => {
  it.each(STEP_IDS)(
    "%s: short public copies retain all labels, keys and teacher explanations",
    (step) => {
      for (const version of [1, 2] as const)
        for (let seed = 0; seed < 16; seed++) {
          const q = generateQuestion(step, seed, version),
            before = JSON.stringify(q);
          const copies = exitReasonCopy(q),
            short = withPublicExitReasons(q);
          expect(new Set(copies.map((r) => r.text)).size).toBe(4);
          for (const [index, copy] of copies.entries()) {
            expect(copy.text.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
            expect(copy.teacherExplanation).toBe(q.reasons[index].text);
            expect(short.reasons[index]).toEqual({
              ...q.reasons[index],
              text: copy.text,
            });
          }
          expect(short.answerKey).toBe(q.answerKey);
          expect(short.reasonKey).toBe(q.reasonKey);
          expect(short.options).toBe(q.options);
          expect(short.params).toBe(q.params);
          expect(short.hints).toBe(q.hints);
          expect(short.metadata.status).toBe("draft");
          expect(short.metadata.reviewer).toBeNull();
          expect(withPublicExitReasons(short)).toBe(short);
          expect(exitReasonCopy(short)).toEqual(copies);
          const projected = toPublicQuestion(short, "reason");
          expect(projected.options).toEqual(
            copies.map(({ label, text }) => ({ label, text })),
          );
          expect(JSON.stringify(projected)).not.toMatch(
            /teacherExplanation|classification|reasonKey|stepId/,
          );
          expect(JSON.stringify(q)).toBe(before);
        }
    },
  );

  it("keeps the actual A4 quantity, subtraction direction and equation operations", () => {
    const a4 = sample("A4", (q) => Boolean(q.params.d));
    const d1 = generateQuestion("D1", 5),
      d5 = generateQuestion("D5", 5);
    const correct = (q: GeneratedQuestion) =>
      exitReasonCopy(q).find((r) => r.label === q.reasonKey)!.text;
    expect(correct(a4)).toBe(
      `Bagi ${a4.params.c} benda menjadi ${a4.params.b} kelompok; ambil satu.`,
    );
    expect(correct(d1)).toBe(
      `Dari −${-d1.params.a}, mundur ${d1.params.b} langkah.`,
    );
    expect(correct(d5)).toBe(
      `Tambah ${-d5.params.b}, lalu bagi ${d5.params.a}, pada kedua ruas.`,
    );
    const copy = exitReasonCopy(d5).find((r) => r.label === d5.reasonKey)!;
    expect(copy.teacherExplanation.split(/\s+/).length).toBeGreaterThan(8);
  });

  it("fails closed on an unknown reason instead of cutting arbitrary prose", () => {
    const q = generateQuestion("C2", 5);
    expect(() =>
      exitReasonCopy({
        ...q,
        reasons: q.reasons.map((r) =>
          r.classification === "correct"
            ? r
            : { ...r, text: "Alasan yang tidak dikenali" },
        ),
      }),
    ).toThrow("Unsupported exit reason");
  });
});

describe("V5 independent content", () => {
  it("publishes the four task roles and compact exits through the existing allowlist", () => {
    const pkg = buildPackage(input),
      projected = toPublicPackage(pkg);
    for (const set of projected.activities) {
      [...set.independent, set.optional].forEach((q, index) => {
        expect(
          promptText(q.prompt).startsWith(INDEPENDENT_TASK_LABELS[index]),
        ).toBe(true);
      });
      expect(
        set.reason.options.every((r) => r.text.trim().split(/\s+/).length <= 8),
      ).toBe(true);
    }
    expect(JSON.stringify(projected)).not.toMatch(
      /teacherExplanation|answerKey|reasonKey|stepId|classId/,
    );
  });

  it("the proposed recipe-hydration adapter restores activity content and hashes across schema parsing", () => {
    const pkg = buildPackage(input);
    const d1 = pkg.activities.find((a) => a.stepId === "D1")!;
    const enriched = applyPackageStories(
      pkg,
      pkg.revision,
      d1.independent.map((q) => ({
        questionId: q.id,
        choice: { frameId: "lift-down-v1" as const, variant: 0 as const },
      })),
    );
    for (const candidate of [pkg, enriched]) {
      const frozen = freezePackage(candidate),
        restored = fromSyncPackage(toSyncPackage(frozen));
      // The integrator must normalize before computing the package hash, inside
      // fromPackageRecipe. Here its already-parsed activities exercise the same
      // helper against schema field ordering without changing the shared adapter.
      expect(restored.activities.map(prepareActivitySet)).toEqual(
        frozen.activities,
      );
      expect(restored.assessment).toEqual(frozen.assessment);
    }
  });

  it.each(STEP_IDS)(
    "%s: context, actual wrong work, practice and multiple-solution extension",
    (step) => {
      const q = generateQuestion(step, 16),
        before = JSON.stringify(q);
      const tasks = [0, 1, 2].map((i) => independentQuestion(q, i));
      tasks.push(optionalQuestion(q));
      for (const [index, task] of tasks.entries()) {
        expect(
          promptText(task.prompt).startsWith(
            `${INDEPENDENT_TASK_LABELS[index]}.`,
          ),
        ).toBe(true);
        expect(task.options).toBe(q.options);
        expect(task.params).toBe(q.params);
        expect(task.mathFingerprint).toBe(q.mathFingerprint);
        expect(task.answerKey).toBe(q.answerKey);
        expect(task.reasonKey).toBe(q.reasonKey);
        expect(
          index === 3
            ? optionalQuestion(task)
            : independentQuestion(task, index),
        ).toBe(task);
      }
      const wrong =
        q.options.find((o) => o.classification === "misconception") ??
        q.options.find((o) => o.classification === "arithmetic-error")!;
      expect(wrong.canonicalValue).not.toBe(
        canonicalAnswer(solveTemplate(step, q.params)),
      );
      expect(promptText(tasks[1].prompt)).toContain(
        `Nala menjawab ${wrong.text}.`,
      );
      expect(promptText(tasks[3].prompt)).toContain("dua ");
      expect(JSON.stringify(q)).toBe(before);
    },
  );

  it("question replacement and story enrichment retain the task role", () => {
    const pkg = buildPackage(input),
      d1 = pkg.activities.find((a) => a.stepId === "D1")!;
    for (let index = 0; index < 4; index++) {
      const before = index < 3 ? d1.independent[index] : d1.optional;
      const updated = replacePackageQuestion(pkg, before.id, 976 + index);
      const set = updated.activities.find((a) => a.stepId === "D1")!;
      const after = index < 3 ? set.independent[index] : set.optional;
      expect(
        promptText(after.prompt).startsWith(INDEPENDENT_TASK_LABELS[index]),
      ).toBe(true);
      expect(after.mathFingerprint).not.toBe(before.mathFingerprint);
    }
    const enriched = applyPackageStories(
      pkg,
      pkg.revision,
      d1.independent.map((q) => ({
        questionId: q.id,
        choice: { frameId: "lift-down-v1" as const, variant: 1 as const },
      })),
    );
    const set = enriched.activities.find((a) => a.stepId === "D1")!;
    set.independent.forEach((q, i) => {
      expect(promptText(q.prompt).startsWith(INDEPENDENT_TASK_LABELS[i])).toBe(
        true,
      );
      expect(promptText(q.prompt)).toContain("Lift berada di lantai");
      expect(q.params).toBe(d1.independent[i].params);
    });
    expect(parseTeacherPackage(enriched)).toEqual(enriched);
  });

  it("rejects a fourth mandatory slot", () => {
    expect(() => independentQuestion(generateQuestion("D1", 1), 3)).toThrow(
      "index",
    );
  });
});

it("V5 reflection follows the assigned material of each group, excluding unused reserve sets", () => {
  const pkg = buildPackage(input);
  const groups = [
    { label: "Segitiga Biru" as const, activityStep: "D1" as const },
    { label: "Lingkaran Oranye" as const, activityStep: "D2" as const },
    {
      label: "Kotak Hijau" as const,
      activityStep: "D3" as const,
      exitBaseStep: "D2",
      extensionSteps: ["D4"],
    },
  ];
  const result = reflectionUsesForGroups(pkg, groups);
  expect(result).toEqual([
    `Segitiga Biru: ${CONTEXTS.D1.use}`,
    `Lingkaran Oranye: ${CONTEXTS.D2.use}`,
    `Kotak Hijau: ${CONTEXTS.D3.use}`,
  ]);
  expect(result.join(" ")).not.toMatch(/D[1-6]|student|mastery/);
  expect(result.join(" ")).not.toContain(CONTEXTS.D4.use);
  expect(reflectionUsesForGroups(pkg, [])).toEqual([]);
  expect(() =>
    reflectionUsesForGroups(pkg, [
      { label: "Kotak Hijau", activityStep: "A1" },
    ]),
  ).toThrow("active package");
});
