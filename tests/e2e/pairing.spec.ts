import { expect, test, type Page } from "@playwright/test";
import { loginTeacher } from "../browser/helpers";
const headers = { Origin: "http://127.0.0.1:3100" };
const post = (page: Page, path: string, data: object) =>
  page.request.post(path, { headers, data });
test("pairing HTTP uses separate board auth, owner checks, public schema, CAS, ACK and revoke", async ({
  page,
  browser,
}) => {
  await loginTeacher(page);
  const classId = crypto.randomUUID();
  expect(
    (
      await post(page, "/api/v1/classes", {
        id: classId,
        label: "7B",
        grade: 7,
        count: 32,
        mode: "demo",
      })
    ).ok(),
  ).toBe(true);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const board = await context.newPage();
  // This is the HTTP protocol scenario. A mounted board would issue its own
  // rotating challenge and ACK while these explicit protocol calls run.
  expect((await post(board, "/api/v1/board/identity", {})).ok()).toBe(true);
  const challenge = await (
    await post(board, "/api/v1/board/pairing", { action: "create" })
  ).json();
  expect(challenge.code).toMatch(/^\d{6}$/);
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
    sessionId: crypto.randomUUID(),
    payload,
  };
  const snapshot = await (await post(page, "/api/v1/pairing", claim)).json();
  expect(Object.keys(snapshot).sort()).toEqual(
    ["envelope", "ackRevision", "ackCommandId", "ackAt"].sort(),
  );
  expect(
    (
      await (
        await post(page, "/api/v1/pairing", {
          action: "heartbeat",
          presentationId: snapshot.envelope.presentationId,
        })
      ).json()
    ).ackRevision,
  ).toBe(0);
  expect((await post(page, "/api/v1/pairing", claim)).status()).toBe(404);
  const env = snapshot.envelope;
  expect(
    await (
      await post(page, "/api/v1/pairing", {
        action: "channel",
        presentationId: env.presentationId,
      })
    ).json(),
  ).toEqual({ kind: "snapshot" });
  const ref = {
    presentationId: env.presentationId,
    channelEpoch: env.channelEpoch,
    commandId: env.commandId,
  };
  const boardSnapshot = await (
    await post(board, "/api/v1/board/pairing", {
      action: "snapshot",
      presentationId: ref.presentationId,
    })
  ).json();
  expect(boardSnapshot.envelope).toEqual(env);
  const staleAck = await post(board, "/api/v1/board/pairing", {
    action: "ack",
    ...ref,
    appliedRevision: 2,
  });
  expect(staleAck.status()).toBe(200);
  expect(await staleAck.json()).toEqual({ applied: false });
  expect(
    (
      await post(board, "/api/v1/pairing", {
        action: "snapshot",
        presentationId: ref.presentationId,
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await post(board, "/api/v1/board/pairing", {
        action: "ack",
        ...ref,
        appliedRevision: 1,
      })
    ).ok(),
  ).toBe(true);
  const ack = await (
    await post(page, "/api/v1/pairing", {
      action: "heartbeat",
      presentationId: ref.presentationId,
    })
  ).json();
  expect(ack.ackRevision).toBe(1);
  const command = {
    action: "publish",
    ...ref,
    commandId: crypto.randomUUID(),
    baseRevision: 1,
    payload: {
      ...payload,
      mode: "groups",
      groups: [
        {
          id: crypto.randomUUID(),
          label: "Segitiga Biru",
          attendanceNumbers: [7],
        },
      ],
    },
  };
  expect(
    (
      await post(page, "/api/v1/pairing", {
        ...command,
        payload: { ...command.payload, name: "PROHIBITED" },
      })
    ).status(),
  ).toBe(422);
  const published = await (await post(page, "/api/v1/pairing", command)).json();
  expect(published.envelope.revision).toBe(2);
  expect(
    (
      await post(page, "/api/v1/pairing", {
        ...command,
        commandId: crypto.randomUUID(),
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await post(page, "/api/v1/pairing", {
        action: "revoke",
        presentationId: ref.presentationId,
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await post(board, "/api/v1/board/pairing", {
        action: "snapshot",
        presentationId: ref.presentationId,
      })
    ).status(),
  ).toBe(403);
  await context.close();
});
