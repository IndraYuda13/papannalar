"use client";
import { z } from "zod";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
import { randomIdSchema } from "../contracts/domain";
import { strategyCodeSchema } from "../contracts/bisik";
const schema = z.strictObject({
  classId: randomIdSchema,
  sessionId: randomIdSchema,
  code: strategyCodeSchema,
  helpful: z.boolean(),
  requestId: randomIdSchema.nullable(),
});
export type BisikFeedback = z.infer<typeof schema>;
export async function saveBisikFeedback(
  scope: LocalScope,
  input: BisikFeedback,
) {
  const value = schema.parse({
    classId: input.classId,
    sessionId: input.sessionId,
    code: input.code,
    helpful: input.helpful,
    requestId: input.requestId,
  });
  const db = openDataDatabase(scope);
  try {
    await localOperation(() =>
      db.table("localMeta").put({
        key: `bisik-feedback:${value.classId}:${value.sessionId}:${value.code}`,
        value: JSON.stringify(value),
      }),
    );
  } finally {
    db.close();
  }
}
