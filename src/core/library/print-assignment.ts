import type {
  PrintAssignment,
  LearningRun as LibraryRunV2,
} from "../learning/types";
export function toPrintAssignment(run: LibraryRunV2): PrintAssignment {
  if (
    run.responseMethod !== "cards" ||
    run.document.items.some((i) => i.kind !== "card")
  )
    throw new Error("INVALID_INPUT");
  return {
    assignmentId: run.assignmentId,
    runId: run.id,
    collectionId: run.collectionId,
    title: run.document.title,
    version: run.version,
    code: `${run.formId.slice(0, 8)} · V${run.version}`,
    items: run.document.items.map((i) => {
      if (i.kind !== "card") throw new Error("INVALID_INPUT");
      return {
        id: i.id,
        prompt: i.prompt,
        options: [...i.options] as [string, string, string, string],
      };
    }),
    binding: {
      intent: "custom_assessment",
      formId: run.formId,
      version: run.version,
      pageIndex: 0,
      rows: run.document.items.length,
    },
  };
}
