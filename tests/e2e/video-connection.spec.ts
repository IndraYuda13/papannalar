import { expect, test, type Page } from "@playwright/test";
import { loginTeacher, openBoard } from "../browser/helpers";
import {
  challengeSchema,
  snapshotSchema,
  connectionPulseSchema,
} from "../../src/contracts/presentation";
const headers = { Origin: "http://127.0.0.1:3100" };
const call = (page: Page, surface: "teacher" | "board", body: object) =>
  page.request.post(
    surface === "teacher" ? "/api/v1/pairing" : "/api/v1/board/pairing",
    { headers, data: body },
  );

// Runs against the real SQL034 RPC once the parent applies it and starts the
// existing test environment. No synthetic server replaces authorization here.
test("V2 re-scan keeps question 3 and presentation identity; displaced controller, replay and revoked QR are blocked", async ({
  page,
  browser,
}) => {
  await loginTeacher(page);
  const classId = crypto.randomUUID(),
    sessionId = crypto.randomUUID();
  expect(
    (
      await page.request.post("/api/v1/classes", {
        headers,
        data: { id: classId, label: "7B", grade: 7, count: 3, mode: "demo" },
      })
    ).ok(),
  ).toBe(true);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const board = await context.newPage();
  try {
    expect(
      (
        await board.request.post("/api/v1/board/identity", {
          headers,
          data: {},
        })
      ).ok(),
    ).toBe(true);
    const challenge = challengeSchema.parse(
      await (await call(board, "board", { action: "create" })).json(),
    );
    const controllerId = crypto.randomUUID(),
      nextController = crypto.randomUUID();
    const payload = {
      schemaVersion: 1,
      mode: "opening",
      question: 1,
      taskEpoch: crypto.randomUUID(),
      groups: [],
    };
    const claim = {
      action: "claim",
      code: challenge.code,
      classId,
      sessionId,
      controllerId,
      payload,
    };
    const first = snapshotSchema.parse(
      await (await call(page, "teacher", claim)).json(),
    );
    const env = first.envelope;
    const third = snapshotSchema.parse(
      await (
        await call(page, "teacher", {
          action: "publish",
          presentationId: env.presentationId,
          channelEpoch: env.channelEpoch,
          baseRevision: env.revision,
          commandId: crypto.randomUUID(),
          controllerId,
          payload: { ...payload, mode: "check", question: 3 },
        })
      ).json(),
    );
    await openBoard(board);
    await expect(board.getByTestId("board-connection")).not.toContainText(
      "Belum tersambung",
    );
    const pulse1 = connectionPulseSchema.parse(
      await (
        await call(board, "board", {
          action: "heartbeat",
          presentationId: env.presentationId,
        })
      ).json(),
    );
    await call(board, "board", {
      action: "snapshot",
      presentationId: env.presentationId,
    });
    const pulse2 = connectionPulseSchema.parse(
      await (
        await call(board, "board", {
          action: "heartbeat",
          presentationId: env.presentationId,
        })
      ).json(),
    );
    expect(pulse2.controllerSeenAt).toBe(pulse1.controllerSeenAt);
    await context.setOffline(true);
    await expect(board.getByTestId("board-connection")).toContainText(
      "Soal tetap",
    );
    await context.setOffline(false);
    const reconnect = challengeSchema.parse(
      await (
        await call(board, "board", {
          action: "create",
          presentationId: env.presentationId,
        })
      ).json(),
    );
    const next = snapshotSchema.parse(
      await (
        await call(page, "teacher", {
          ...claim,
          code: reconnect.code,
          controllerId: nextController,
        })
      ).json(),
    );
    expect(next.envelope.presentationId).toBe(env.presentationId);
    expect(next.envelope.payload).toEqual(third.envelope.payload);
    expect(next.envelope.revision).toBe(third.envelope.revision);
    expect(next.envelope.channelEpoch).not.toBe(third.envelope.channelEpoch);
    expect(
      (
        await call(page, "teacher", {
          action: "snapshot",
          presentationId: env.presentationId,
          controllerId,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await call(page, "teacher", {
          action: "publish",
          presentationId: env.presentationId,
          channelEpoch: third.envelope.channelEpoch,
          baseRevision: third.envelope.revision,
          commandId: crypto.randomUUID(),
          controllerId,
          payload,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await call(page, "teacher", {
          ...claim,
          code: reconnect.code,
          controllerId: nextController,
        })
      ).status(),
    ).toBe(404);
    const pending = challengeSchema.parse(
      await (
        await call(board, "board", {
          action: "create",
          presentationId: env.presentationId,
        })
      ).json(),
    );
    expect(
      (
        await call(page, "teacher", {
          action: "revoke",
          presentationId: env.presentationId,
          controllerId: nextController,
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await call(page, "teacher", {
          ...claim,
          code: pending.code,
          controllerId: nextController,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await call(board, "board", {
          action: "snapshot",
          presentationId: env.presentationId,
        })
      ).status(),
    ).toBe(403);
    expect(
      await (
        await call(page, "teacher", {
          action: "resume",
          classId,
          sessionId,
          controllerId: nextController,
        })
      ).json(),
    ).toEqual({ snapshot: null });
  } finally {
    await context.close();
  }
});
