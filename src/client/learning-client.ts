"use client";
import { z } from "zod";
import type { LocalScope } from "../local/scope";
import { readLocalAccess } from "../local/access";
import { openDataDatabase } from "../local/data-database";
import {
  libraryV2ActionSchema,
  type LibraryV2Action,
  runDetailV2Schema,
  type RunDetail,
} from "../contracts/library";
import {
  groupLessonSchema,
  groupLessonActionSchema,
  type GroupLesson,
  type GroupLessonAction,
} from "../contracts/group-lesson";
import {
  groupBoardStateSchema,
  type GroupBoardState,
} from "../contracts/group-board";
import {
  resultsIndexSchema,
  resultDetailSchema,
  resultsActionSchema,
  type ResultsAction,
  type ResultDetail,
} from "../contracts/results-index";
export class LearningRequestError extends Error {
  constructor(
    public readonly status: number,
    code: string,
  ) {
    super(code);
  }
}
async function call(path: string, input: unknown): Promise<unknown> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = z
        .strictObject({ error: z.strictObject({ code: z.string() }) })
        .safeParse(data);
      throw new LearningRequestError(
        response.status,
        error.success ? error.data.error.code : "UNAVAILABLE",
      );
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
export async function libraryV2Call(
  action: LibraryV2Action | Omit<LibraryV2Action, "contractVersion">,
): Promise<unknown> {
  return call(
    "/api/v1/library",
    libraryV2ActionSchema.parse({ ...action, contractVersion: 2 }),
  );
}
export function groupLessonCall(
  action: Extract<GroupLessonAction, { action: "list" }>,
): Promise<{ lessons: GroupLesson[] }>;
export function groupLessonCall(
  action: Extract<GroupLessonAction, { action: "board-action" }>,
): Promise<GroupBoardState>;
export function groupLessonCall(
  action: Exclude<GroupLessonAction, { action: "list" | "board-action" }>,
): Promise<GroupLesson>;
export async function groupLessonCall(action: GroupLessonAction) {
  const data = await call(
    "/api/v1/group-lessons",
    groupLessonActionSchema.parse(action),
  );
  return action.action === "list"
    ? z.strictObject({ lessons: z.array(groupLessonSchema) }).parse(data)
    : action.action === "board-action"
      ? groupBoardStateSchema.parse(data)
      : groupLessonSchema.parse(data);
}
async function access(scope: LocalScope) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
}
async function cached<T>(
  scope: LocalScope,
  key: string,
  schema: z.ZodType<T>,
  load: () => Promise<T>,
): Promise<{ value: T; cached: boolean }> {
  await access(scope);
  const db = openDataDatabase(scope);
  try {
    try {
      if (!navigator.onLine) throw new TypeError("OFFLINE");
      const value = schema.parse(await load());
      await access(scope);
      await db.table("learningCache").put({ key: `v2:${key}`, value });
      return { value, cached: false };
    } catch (error) {
      if (
        !(error instanceof TypeError) &&
        !(error instanceof LearningRequestError && error.status >= 500) &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        throw error;
      await access(scope);
      const row = await db
        .table<{ value: unknown }>("learningCache")
        .get(`v2:${key}`);
      if (!row) throw error;
      return { value: schema.parse(row.value), cached: true };
    }
  } finally {
    db.close();
  }
}
export async function readGroupLesson(scope: LocalScope, id: string) {
  const result = await cached(scope, `lesson:${id}`, groupLessonSchema, () =>
    groupLessonCall({ action: "detail", id }),
  );
  return { lesson: result.value, cached: result.cached };
}
export async function readResultsIndex(
  scope: LocalScope,
  filters: Omit<Extract<ResultsAction, { action: "list" }>, "action"> = {},
) {
  const action = resultsActionSchema.parse({ action: "list", ...filters });
  const result = await cached(
    scope,
    `index:${JSON.stringify(filters)}`,
    resultsIndexSchema,
    async () => resultsIndexSchema.parse(await call("/api/v1/results", action)),
  );
  return { ...result.value, cached: result.cached };
}
export async function readLearningResult(
  scope: LocalScope,
  input: Omit<Extract<ResultsAction, { action: "detail" }>, "action">,
): Promise<ResultDetail> {
  const action = resultsActionSchema.parse({ action: "detail", ...input });
  const result = await cached(
    scope,
    `result:${input.source}:${input.id}`,
    resultDetailSchema,
    async () => resultDetailSchema.parse(await call("/api/v1/results", action)),
  );
  return result.value;
}
export type CardResponse = Extract<LibraryV2Action, { action: "response" }>;
export async function pendingGroupCardResponses(
  scope: LocalScope,
): Promise<CardResponse[]> {
  await access(scope);
  const db = openDataDatabase(scope);
  try {
    const rows = await db
      .table<{ value: unknown }>("learningPending")
      .toArray();
    return rows
      .map((row) => libraryV2ActionSchema.parse(row.value))
      .filter((a): a is CardResponse => a.action === "response");
  } finally {
    db.close();
  }
}
export async function resolveGroupCardResponse(
  scope: LocalScope,
  expected: CardResponse,
  choice: "local" | "server",
  remoteRevision: number,
) {
  await access(scope);
  const db = openDataDatabase(scope);
  const key = `${expected.id}:${expected.studentId}`;
  try {
    await db.transaction("rw", db.table("learningPending"), async () => {
      const row = await db
        .table<{ value: unknown }>("learningPending")
        .get(key);
      if (JSON.stringify(row?.value) !== JSON.stringify(expected))
        throw new Error("CONFLICT");
      if (choice === "server") await db.table("learningPending").delete(key);
      else
        await db.table("learningPending").put({
          key,
          value: libraryV2ActionSchema.parse({
            ...expected,
            revision: remoteRevision,
          }),
        });
    });
  } finally {
    db.close();
  }
}
export async function queueGroupCardResponse(
  scope: LocalScope,
  action: CardResponse,
) {
  await access(scope);
  const value = libraryV2ActionSchema.parse(action);
  const db = openDataDatabase(scope);
  try {
    await db.transaction("rw", db.table("learningPending"), async () => {
      const key = `${action.id}:${action.studentId}`;
      const old = await db
        .table<{ value: unknown }>("learningPending")
        .get(key);
      const predecessor = old ? libraryV2ActionSchema.parse(old.value) : null;
      await db.table("learningPending").put({
        key,
        value: {
          ...value,
          ...(predecessor?.action === "response"
            ? { revision: predecessor.revision }
            : {}),
        },
      });
    });
  } finally {
    db.close();
  }
}
export async function syncGroupCardResponses(
  scope: LocalScope,
): Promise<number> {
  await access(scope);
  const db = openDataDatabase(scope);
  let accepted = 0;
  try {
    const rows = await db
      .table<{ key: string; value: unknown }>("learningPending")
      .toArray();
    for (const row of rows) {
      await access(scope);
      const action = libraryV2ActionSchema.parse(row.value);
      if (action.action !== "response") throw new Error("INVALID_INPUT");
      const receipt: RunDetail = runDetailV2Schema.parse(
        await libraryV2Call(action),
      );
      await access(scope);
      await db.transaction("rw", db.table("learningPending"), async () => {
        const current = await db
          .table<{ value: unknown }>("learningPending")
          .get(row.key);
        if (JSON.stringify(current?.value) === JSON.stringify(row.value))
          await db.table("learningPending").delete(row.key);
        else if (current) {
          const next = libraryV2ActionSchema.parse(current.value);
          const response = receipt.responses.find(
            (r) => r.studentId === action.studentId,
          );
          if (
            next.action === "response" &&
            response &&
            next.revision === action.revision
          )
            await db.table("learningPending").put({
              key: row.key,
              value: { ...next, revision: response.revision },
            });
        }
      });
      accepted++;
    }
    return accepted;
  } finally {
    db.close();
  }
}
