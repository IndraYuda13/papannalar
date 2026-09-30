import type { BoardPackage, BoardRunPlan } from "../../contracts/board-package";
import {
  publicPresentation,
  type PresentationState,
} from "../../contracts/presentation";
import type { PublicQuestion } from "../../contracts/package";

export type BoardPage = { label: string; state: PresentationState };
// This is display navigation, never an assessment/rotation/turn-count event.
export function packagePages(
  p: BoardPackage,
  plan: BoardRunPlan | undefined,
  epoch: string,
  selectedActivity?: string,
): BoardPage[] {
  const content = p.content;
  const groups =
    plan?.groups.map((g) => ({
      id: g.id,
      label: g.label,
      attendanceNumbers: g.attendanceNumbers,
    })) ?? [];
  const common = {
    schemaVersion: 1 as const,
    question: 1,
    taskEpoch: epoch,
    groups,
    package: { id: content.id, revision: content.revision },
    lesson: p.lesson,
    layout: {
      touchZone: p.lesson.intuitiveOnly ? ("sd" as const) : ("normal" as const),
      largeObjects: false,
    },
  };
  const pages: BoardPage[] = [];
  const add = (label: string, state: PresentationState) =>
    pages.push({ label, state: publicPresentation(state) });
  add("Pembuka", { ...common, mode: "opening" });
  if (content.assessment.length === 5 || content.assessment.length === 10) {
    const total = content.assessment.length;
    content.assessment.forEach((question, i) =>
      add(`Soal ${i + 1}`, {
        ...common,
        mode: "check",
        question: i + 1,
        check: {
          packageId: content.id,
          revision: content.revision,
          total,
          seconds: p.seconds,
          question,
        },
      }),
    );
  }
  add("Lanjutan", { ...common, mode: "continuation" });
  const activity = (id: string) => {
    const a = content.activities.find((a) => a.id === id);
    if (!a) throw new Error("Public activity unavailable");
    return a;
  };
  const tool = (q: PublicQuestion) =>
    p.models.find((m) => m.questionId === q.id)?.tool;
  if (plan?.groups.length) {
    add("Kelompok", { ...common, mode: "groups", station: plan.firstStation });
    if (plan.stations.length === 1 && plan.groups.length >= 2) {
      add("Panel Terbagi", {
        ...common,
        mode: "split",
        split: {
          panels: plan.groups.map((g) => ({
            groupId: g.id,
            exercises: activity(g.activityId).board.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              tool: tool(q),
            })),
          })),
        },
      });
    } else
      for (const station of plan.stations) {
        const g = plan.groups.find((g) =>
          station.assignments.some(
            (a) => a.groupId === g.id && a.station === "Papan",
          ),
        );
        if (!g) continue;
        const set = activity(g.activityId);
        set.board.forEach((q, i) =>
          add(`${g.label} · Tugas ${i + 1}`, {
            ...common,
            mode: "station",
            station,
            tool: tool(q),
            pattern: tool(q)
              ? p.lesson.intuitiveOnly
                ? "watch"
                : "build"
              : undefined,
            activity: {
              id: q.id,
              groupId: g.id,
              index: i + 1,
              total: set.board.length,
              prompt: q.prompt,
              independent: station.assignments
                .filter((a) => a.station === "Mandiri")
                .map((a) => ({
                  groupId: a.groupId,
                  prompts: activity(
                    plan.groups.find((g) => g.id === a.groupId)!.activityId,
                  ).independent.map((q) => q.prompt),
                })),
            },
          }),
        );
      }
    if (!p.lesson.oralReflection)
      for (const row of [1, 2, 3])
        add(`Kartu Keluar · Baris ${row}`, {
          ...common,
          mode: "exit",
          question: row,
          exit: {
            id: plan.id,
            row,
            groups: plan.groups.map((g) => ({
              id: g.id,
              label: g.label,
              attendanceNumbers: g.attendanceNumbers,
              question:
                row === 3
                  ? activity(g.contextActivityId).exitContext
                  : row === 2
                    ? activity(g.exitActivityId).reason
                    : activity(g.exitActivityId).exit,
            })),
          },
        });
  } else {
    const set = activity(selectedActivity ?? content.activities[0].id);
    set.board.forEach((q, i) =>
      add(`Latihan ${i + 1}`, {
        ...common,
        mode: "station",
        tool: tool(q),
        pattern: tool(q)
          ? p.lesson.intuitiveOnly
            ? "watch"
            : "build"
          : undefined,
        practice: { question: q, independent: set.independent },
      }),
    );
    if (!p.lesson.oralReflection)
      [set.exit, set.reason, set.exitContext].forEach((q, i) =>
        add(`Kartu Keluar · Baris ${i + 1}`, {
          ...common,
          mode: "exit",
          question: i + 1,
          practice: { question: q, independent: [] },
        }),
      );
  }
  add("Refleksi", { ...common, mode: "reflection" });
  return pages;
}

export function currentPackagePage(
  pages: readonly BoardPage[],
  state?: PresentationState,
): number {
  if (!state) return 0;
  const index = pages.findIndex(
    (p) =>
      p.state.mode === state.mode &&
      p.state.question === state.question &&
      p.state.activity?.id === state.activity?.id &&
      p.state.practice?.question.id === state.practice?.question.id,
  );
  return Math.max(0, index);
}
