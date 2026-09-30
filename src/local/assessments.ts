"use client";
import type { Table } from "dexie";
import {
  parseAssessmentContext,
  cardInputSchema,
  parseSavedCard,
  responseEvent,
  type AssessmentContext,
  type SavedCard,
  type CardInput,
} from "../contracts/assessment";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { gradeCard } from "../core/assessment/card-response";
import { localOperation, type LocalScope } from "./scope";
import { openDataDatabase } from "./data-database";
import { parseCycle } from "../contracts/cycle";
import { reviseCycle } from "../core/session/cycle";
import { assertSessionWriter } from "./writer";

export function createAssessmentRepository(scope: LocalScope) {
  const db = openDataDatabase(scope);
  const sessions: Table<AssessmentContext, string> = db.table("sessions");
  const responses: Table<SavedCard, string> = db.table("responses");
  type Event = ReturnType<typeof responseEvent>;
  const events: Table<Event, string> = db.table("events"),
    outbox: Table<Event, string> = db.table("outbox");
  async function context(id: string) {
    const value = parseAssessmentContext(
      await sessions.get(parseBoundary(randomIdSchema, id)),
    );
    if (value.classroom.mode !== scope.mode) throw new Error("Wrong namespace");
    return value;
  }
  return {
    create: (input: AssessmentContext) =>
      localOperation(async () => {
        const value = parseAssessmentContext(input);
        if (value.classroom.mode !== scope.mode)
          throw new Error("Wrong namespace");
        await sessions.add(value);
      }),
    list: () =>
      localOperation(async () =>
        (await sessions.toArray()).map(parseAssessmentContext),
      ),
    read: (id: string) =>
      localOperation(async () => {
        const value = await context(id);
        const rows = await responses.where("sessionId").equals(id).toArray();
        return {
          context: value,
          cards: rows.map((row) => parseSavedCard(value, row)),
        };
      }),
    save: (sessionId: string, input: CardInput) =>
      localOperation(async () => {
        const value = parseBoundary(cardInputSchema, input);
        return db.transaction(
          "rw",
          [
            sessions,
            responses,
            events,
            outbox,
            db.table("cycles"),
            db.table("syncMeta"),
          ],
          async () => {
            const ctx = await context(sessionId);
            await assertSessionWriter(db, ctx.session.sessionId);
            const binding = ctx.bindings.find(
              (b) => b.studentId === value.studentId,
            );
            if (!binding) throw new Error("Unknown student");
            const id = `${ctx.id}/${value.studentId}`,
              previous = await responses.get(id);
            if (previous && value.expectedRevision === 0)
              return {
                status: "duplicate" as const,
                card: parseSavedCard(ctx, previous),
              };
            if ((previous?.graded.revision ?? 0) !== value.expectedRevision)
              return { status: "conflict" as const };
            const card = parseSavedCard(ctx, {
              id,
              sessionId: ctx.id,
              studentId: value.studentId,
              choices: value.choices,
              graded: gradeCard(
                binding,
                ctx.keysByStudent?.find((k) => k.studentId === value.studentId)
                  ?.keys ?? ctx.keys,
                value.choices,
                value.expectedRevision + 1,
                value.source,
              ),
            });
            const event = responseEvent(ctx, card);
            await responses.put(card);
            await events.add(event);
            await outbox.add(event);
            const cycle = await db.table("cycles").get(ctx.session.sessionId);
            if (cycle)
              await db.table("cycles").put(reviseCycle(parseCycle(cycle)));
            return { status: "saved" as const, card };
          },
        );
      }),
    counts: (id: string) =>
      localOperation(async () => {
        const ctx = await context(id);
        const matches = (e: Event) =>
          ctx.parentSessionId ? e.recordId === ctx.id : !e.recordId;
        return {
          events: await events
            .where("sessionId")
            .equals(ctx.session.sessionId)
            .filter(matches)
            .count(),
          outbox: await outbox
            .where("sessionId")
            .equals(ctx.session.sessionId)
            .filter(matches)
            .count(),
        };
      }),
    remove: (id: string) =>
      localOperation(() =>
        db.transaction("rw", db.tables, async () => {
          const ctx = await context(id);
          if (ctx.parentSessionId)
            throw new Error("Delete the parent session with its assessments");
          if (await db.table("cycles").get(id))
            throw new Error("Delete the class after server confirmation");
          const children = (await sessions.toArray()).filter(
            (c) => c.parentSessionId === id,
          );
          for (const child of children) {
            await responses.where("sessionId").equals(child.id).delete();
            await sessions.delete(child.id);
          }
          await db.table("exits").where("sessionId").equals(id).delete();
          const matches = (e: Event) => e.sessionId === id;
          await responses.where("sessionId").equals(id).delete();
          await events
            .where("sessionId")
            .equals(ctx.session.sessionId)
            .filter(matches)
            .delete();
          await outbox
            .where("sessionId")
            .equals(ctx.session.sessionId)
            .filter(matches)
            .delete();
          await sessions.delete(id);
        }),
      ),
    close: () => db.close(),
  };
}
