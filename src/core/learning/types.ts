import type { ToolTask, ToolModel } from "../tools/patterns";
export type CompetencyMapping = null | {
  topicId: string;
  competencyId: string;
  mappingVersion: 1;
};
export type EvidenceSelection = {
  studentId: string;
  status: "known" | "unknown";
  reason:
    "comparable" | "no_result" | "unmapped" | "incomplete" | "not_comparable";
  evidence: null | {
    source: "library_cards";
    runId: string;
    collectionId: string;
    version: number;
    responseRevision: number;
    assessedAt: string;
    competencyId: string;
    comparisonKey: string;
    itemIds: string[];
    correct: number;
    total: number;
  };
};
export type LearningItem =
  | {
      id: string;
      prompt: string;
      kind: "card";
      options: [string, string, string, string];
      key: "A" | "B" | "C" | "D";
      explanation: string;
    }
  | { id: string; prompt: string; kind: "interactive"; tool: ToolTask }
  | { id: string; prompt: string; kind: "writing" };
export type LearningRun = {
  id: string;
  collectionId: string;
  version: number;
  date: string;
  synthetic: boolean;
  responseMethod: "none" | "cards";
  mapping: {
    default: CompetencyMapping;
    overrides: Array<{ itemId: string; mapping: CompetencyMapping }>;
  };
  document: { title: string; items: LearningItem[] };
  assignmentId: string | null;
  formId: string;
};
export type LearningDetail = {
  run: LearningRun;
  responses: Array<{
    studentId: string;
    revision: number;
    status: "received" | "review";
    answers: Array<"A" | "B" | "C" | "D" | "?" | null>;
    answerStates: Array<"answered" | "blank" | "unreadable">;
  }>;
};
export type LessonPresence = Array<{ id: string; attendanceNumber: number }>;
export type LessonGroups = Array<{
  id: string;
  label: string;
  studentIds: string[];
}>;
export type PrintAssignment = {
  assignmentId: string | null;
  runId: string;
  collectionId: string;
  title: string;
  version: number;
  code: string;
  items: Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];
  }>;
  binding: {
    intent: "custom_assessment";
    formId: string;
    version: number;
    pageIndex: 0;
    rows: number;
  };
};
export function decodeModelNumbers(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.map((x) => decodeModelNumbers(x, key));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (
      key !== "base" &&
      key !== "scale" &&
      Object.keys(o).length === 2 &&
      typeof o.numerator === "number" &&
      typeof o.denominator === "number"
    )
      return {
        numerator: BigInt(o.numerator),
        denominator: BigInt(o.denominator),
      };
    return Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, decodeModelNumbers(v, k)]),
    );
  }
  return value;
}
export type BoardAnswer =
  | { kind: "card"; choice: "A" | "B" | "C" | "D" | "?" }
  | { kind: "interactive"; model: { kind: ToolModel["kind"]; state: unknown } };
export type BoardState = {
  assignmentId: string;
  runId: string;
  groupLabel: string;
  title: string;
  position: number;
  total: number;
  revision: number;
  taskEpoch: string;
  status: "active" | "completed" | "stopped";
  item: Omit<LearningItem, "key" | "explanation">;
  answer: BoardAnswer | null;
  feedback: null | { status: "correct" | "try_again" | "not_checkable" };
  checked: boolean;
  canNext: boolean;
};
export type BoardMutation = {
  assignmentId: string;
  revision: number;
  taskEpoch: string;
} & (
  | { action: "answer"; answer: BoardAnswer }
  | { action: "check" }
  | { action: "next" | "finish"; skip: boolean }
);
