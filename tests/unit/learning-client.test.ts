import { it, expect, vi, afterEach } from "vitest";
import {
  libraryV2Call,
  LearningRequestError,
} from "../../src/local/learning-client";
import { libraryV2ActionSchema } from "../../src/contracts/library";
import {
  resultsActionSchema,
  resultsIndexSchema,
} from "../../src/contracts/results-index";
afterEach(() => vi.unstubAllGlobals());
it("negotiates v2 without sending private fields", async () => {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe("/api/v1/library");
    expect(init.method).toBe("POST");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);
  await libraryV2Call({ action: "list" });
  expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({
    action: "list",
    contractVersion: 2,
  });
  await expect(
    libraryV2Call({ action: "list", displayName: "PRIVATE" } as never),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("preserves actionable CAS denial", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(JSON.stringify({ error: { code: "CONFLICT" } }), {
        status: 409,
      }),
  );
  await expect(libraryV2Call({ action: "list" })).rejects.toMatchObject({
    status: 409,
    message: "CONFLICT",
  });
  expect(new LearningRequestError(403, "FORBIDDEN").status).toBe(403);
});
it("requires actual blank row states and prevents received blank grading", () => {
  const id = "b0000000-0000-4000-8000-000000000001";
  const base = {
    contractVersion: 2,
    action: "response",
    id,
    formId: id,
    version: 1,
    pageIndex: 0,
    studentId: id,
    revision: 0,
    source: "scan",
    answers: [null],
    answerStates: ["blank"],
    status: "review",
  };
  expect(libraryV2ActionSchema.safeParse(base).success).toBe(true);
  expect(
    libraryV2ActionSchema.safeParse({ ...base, status: "received" }).success,
  ).toBe(false);
  expect(
    libraryV2ActionSchema.safeParse({ ...base, answers: ["?"] }).success,
  ).toBe(false);
});
it("keeps a results index written before the collection field readable", () => {
  const id = "7b000000-0000-4000-8000-000000000001",
    legacy = {
      key: "library:" + id,
      source: "library",
      id,
      classId: id,
      classLabel: "7B",
      date: "2026-10-25",
      title: "Latihan rekaman",
      status: "active",
      template: "cards",
      synthetic: false,
    };
  // The collection is derived on read, so an index cached before the field
  // existed still validates and renders, with no collection to filter on yet.
  const parsed = resultsIndexSchema.parse({
    entries: [legacy],
    nextCursor: null,
  });
  expect(parsed.entries[0].collectionId).toBeNull();
  expect(parsed.entries[0].collectionLabel).toBeNull();
  const collectionId = "7b000000-0000-4000-8000-000000000002";
  expect(resultsActionSchema.parse({ action: "list", collectionId })).toEqual({
    action: "list",
    collectionId,
  });
  // The allowlist stays closed to anything the index cannot filter on.
  expect(
    resultsActionSchema.safeParse({ action: "list", kumpulan: collectionId })
      .success,
  ).toBe(false);
});
