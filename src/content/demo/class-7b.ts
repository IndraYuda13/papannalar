import type { StepId } from "../ladder/registry";
import type { GroupStudent } from "../../core/groups/grouping";

// New engineering fixture from TECH_SPEC 17.1, not a recovered source canvas.
export const DEMO_CONTENT_SEED = 70032;
export const DEMO_LABEL_SEED = 80; // Pinned by golden grouping test.
export const DEMO_RESERVED_ATTENDANCE = [7, 12, 25] as const;
export function demoStep(attendance: number): StepId {
  if (!Number.isInteger(attendance) || attendance < 1 || attendance > 32)
    throw new RangeError("Invalid demo attendance");
  return attendance <= 7
    ? "D1"
    : attendance <= 20
      ? "D2"
      : attendance <= 28
        ? "D3"
        : "D4";
}
export function demoGroupRoster(): readonly GroupStudent[] {
  return Array.from({ length: 32 }, (_, i) => ({
    studentId: `7b000000-0000-4000-8000-${(i + 1).toString(16).padStart(12, "0")}`,
    attendanceNumber: i + 1,
    active: true,
    displayed: { kind: "step", stepId: demoStep(i + 1) },
  }));
}
