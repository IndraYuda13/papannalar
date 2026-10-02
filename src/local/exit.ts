"use client";
import type { Table } from "dexie";
import { parseExitPlan } from "../contracts/exit";
import {
  parseAssessmentContext,
  type AssessmentContext,
} from "../contracts/assessment";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { exitBindings, exitKeys, type ExitPlan } from "../core/assessment/exit";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
import { assertSessionWriter } from "./writer";
export function createExitRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    plans: Table<ExitPlan, string> = db.table("exits"),
    sessions: Table<AssessmentContext, string> = db.table("sessions");
  return {
    create: (input: ExitPlan, ctx: AssessmentContext) =>
      localOperation(() =>
        db.transaction(
          "rw",
          plans,
          sessions,
          db.table("syncMeta"),
          async () => {
            const plan = parseExitPlan(input),
              context = parseAssessmentContext(ctx);
            await assertSessionWriter(db, plan.sessionId);
            if (
              context.classroom.mode !== scope.mode ||
              plan.id !== context.id ||
              plan.sessionId !== context.parentSessionId ||
              plan.classId !== context.classroom.id
            )
              throw new Error("Exit context mismatch");
            if (
              JSON.stringify(context.bindings) !==
                JSON.stringify(exitBindings(plan)) ||
              plan.groups
                .flatMap((g) => g.members)
                .some(
                  (s) =>
                    JSON.stringify(
                      context.keysByStudent?.find(
                        (k) => k.studentId === s.studentId,
                      )?.keys,
                    ) !== JSON.stringify(exitKeys(plan, s.studentId)),
                )
            )
              throw new Error("Exit keys/binding mismatch");
            const old = await plans
              .where("sessionId")
              .equals(plan.sessionId)
              .first();
            if (old) {
              if (JSON.stringify(old) !== JSON.stringify(plan))
                throw new Error("Frozen exit already exists");
              return;
            }
            await plans.add(plan);
            await sessions.add(context);
          },
        ),
      ),
    read: (sessionId: string) =>
      localOperation(async () => {
        const plan = await plans
          .where("sessionId")
          .equals(parseBoundary(randomIdSchema, sessionId))
          .first();
        return plan ? parseExitPlan(plan) : undefined;
      }),
    close: () => db.close(),
  };
}
