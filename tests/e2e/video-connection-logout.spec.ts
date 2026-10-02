import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  challengeSchema,
  snapshotSchema,
} from "../../src/contracts/presentation";
import { classListSchema } from "../../src/contracts/classes";

const origin = "http://127.0.0.1:3100";
const headers = { Origin: origin };
const post = (client: APIRequestContext, path: string, data: object) =>
  client.post(path, { headers, data });
const pairing = (client: APIRequestContext, board: boolean, data: object) =>
  post(client, board ? "/api/v1/board/pairing" : "/api/v1/pairing", data);

async function login(client: APIRequestContext, email: string) {
  expect((await post(client, "/auth/login", { email })).ok()).toBe(true);
  // Local test mailbox only, matching the existing browser helper.
  const link = await client.get(
    `http://127.0.0.1:54325/__test/link?email=${encodeURIComponent(email)}`,
  );
  const { url } = (await link.json()) as { url: string };
  expect((await client.get(url)).ok()).toBe(true);
}
async function claim(
  client: APIRequestContext,
  board: APIRequestContext,
  classId: string,
  controllerId: string,
) {
  expect((await post(board, "/api/v1/board/identity", {})).ok()).toBe(true);
  const challenge = challengeSchema.parse(
    await (await pairing(board, true, { action: "create" })).json(),
  );
  const input = {
    action: "claim",
    code: challenge.code,
    classId,
    controllerId,
    sessionId: crypto.randomUUID(),
    payload: {
      schemaVersion: 1,
      mode: "opening",
      question: 3,
      taskEpoch: crypto.randomUUID(),
      groups: [],
    },
  };
  const snapshot = snapshotSchema.parse(
    await (await pairing(client, false, input)).json(),
  );
  return { input, snapshot };
}

// Requires SQL034 and parent migration037 (video-connection-logout.sql).
// Run sequentially with the parent's other shared sample-account checks.
test.describe.configure({ mode: "serial" });
test("logout revokes only this controller across independent logins of the same teacher; retired UUID cannot re-claim", async ({
  playwright,
}) => {
  const clients = await Promise.all(
    Array.from({ length: 4 }, () =>
      playwright.request.newContext({ baseURL: origin }),
    ),
  );
  const [teacherA, teacherB, boardA, boardB] = clients;
  try {
    const email = `logout-${crypto.randomUUID()}@qa.invalid`;
    await login(teacherA, email);
    await login(teacherB, email);
    expect(await (await teacherA.get("/api/v1/teacher")).json()).toEqual(
      await (await teacherB.get("/api/v1/teacher")).json(),
    );
    const classId = crypto.randomUUID(),
      controllerA = crypto.randomUUID(),
      controllerB = crypto.randomUUID();
    expect(
      (
        await post(teacherA, "/api/v1/classes", {
          id: classId,
          label: "7B",
          grade: 7,
          count: 3,
          mode: "demo",
        })
      ).ok(),
    ).toBe(true);
    const first = await claim(teacherA, boardA, classId, controllerA);
    const other = await claim(teacherB, boardB, classId, controllerB);
    expect(
      (
        await post(teacherA, "/auth/logout", { controllerId: controllerA })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await pairing(boardA, true, {
          action: "snapshot",
          presentationId: first.snapshot.envelope.presentationId,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await pairing(boardB, true, {
          action: "snapshot",
          presentationId: other.snapshot.envelope.presentationId,
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await pairing(teacherB, false, {
          action: "heartbeat",
          controllerId: controllerB,
          presentationId: other.snapshot.envelope.presentationId,
        })
      ).ok(),
    ).toBe(true);
    expect(
      await (
        await pairing(teacherB, false, {
          action: "resume",
          controllerId: controllerA,
          classId,
          sessionId: first.input.sessionId,
        })
      ).json(),
    ).toEqual({ snapshot: null });
    const fresh = challengeSchema.parse(
      await (await pairing(boardA, true, { action: "create" })).json(),
    );
    expect(
      (
        await pairing(teacherB, false, { ...first.input, code: fresh.code })
      ).status(),
    ).toBe(403);
    // A fresh, explicit controller claim remains possible for the open session.
    expect(
      (
        await pairing(teacherB, false, {
          ...first.input,
          code: fresh.code,
          controllerId: crypto.randomUUID(),
        })
      ).ok(),
    ).toBe(true);
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
});

test("displaced sample observer logout cannot revoke the active device even if the tab UUID is known", async ({
  playwright,
}) => {
  const clients = await Promise.all(
    Array.from({ length: 3 }, () =>
      playwright.request.newContext({ baseURL: origin }),
    ),
  );
  const [observer, active, board] = clients;
  try {
    const accessCode = process.env["SAMPLE_ACCESS_CODE"] ?? "";
    expect((await post(observer, "/auth/sample", { accessCode })).ok()).toBe(
      true,
    );
    expect(
      (await post(observer, "/api/v1/sample/control", { takeover: true })).ok(),
    ).toBe(true);
    expect((await post(active, "/auth/sample", { accessCode })).ok()).toBe(
      true,
    );
    expect(
      (await post(active, "/api/v1/sample/control", { takeover: true })).ok(),
    ).toBe(true);
    const classes = classListSchema.parse(
      await (await active.get("/api/v1/classes?mode=demo")).json(),
    );
    expect(classes.classes.length).toBeGreaterThan(0);
    const controllerId = crypto.randomUUID();
    const { snapshot } = await claim(
      active,
      board,
      classes.classes[0].id,
      controllerId,
    );
    const presentationId = snapshot.envelope.presentationId;
    expect((await post(observer, "/auth/logout", { controllerId })).ok()).toBe(
      true,
    );
    expect(
      (await pairing(board, true, { action: "snapshot", presentationId })).ok(),
    ).toBe(true);
    expect(
      (
        await pairing(active, false, {
          action: "heartbeat",
          presentationId,
          controllerId,
        })
      ).ok(),
    ).toBe(true);
    expect((await post(active, "/auth/logout", { controllerId })).ok()).toBe(
      true,
    );
    expect(
      (
        await pairing(board, true, { action: "snapshot", presentationId })
      ).status(),
    ).toBe(403);
  } finally {
    await Promise.all(clients.map((client) => client.dispose()));
  }
});
