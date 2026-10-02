import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { id } from "../fixtures/placement";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  teacher: vi.fn(),
  sample: vi.fn(),
  user: vi.fn(),
}));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({
    client: { rpc: mock.rpc, auth: { getUser: mock.user } },
    finish: (response: NextResponse) => response,
  }),
  requireTeacher: mock.teacher,
}));
vi.mock("../../src/server/sample-controller", () => ({
  requireSampleController: mock.sample,
  sampleControllerToken: () => null,
}));
import { pairingRequest } from "../../src/server/pairing/service";
const origin = "https://kelas.example";
const payload = {
  schemaVersion: 1,
  mode: "opening",
  question: 1,
  taskEpoch: id(9),
  groups: [],
};
const value = {
  envelope: {
    protocolVersion: 1,
    presentationId: id(1),
    channelEpoch: id(2),
    revision: 3,
    commandId: id(3),
    packageVersion: "prelim-7b-v1",
    payload,
  },
  ackRevision: 0,
  ackCommandId: null,
  ackAt: null,
};
function request(data: object, originHeader = origin) {
  return new NextRequest(`${origin}/api/v1/pairing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: originHeader },
    body: JSON.stringify(data),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("PAIRING_SECRET", "UNIT-ONLY-PEPPER-NOT-A-CREDENTIAL-123456");
  mock.teacher.mockResolvedValue({ id: id(5) });
  mock.sample.mockResolvedValue(undefined);
  mock.user.mockResolvedValue({
    data: { user: { id: id(6), is_anonymous: true } },
    error: null,
  });
  mock.rpc.mockResolvedValue({ data: value, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("pairing route auth and strict connection boundaries (mocked DB)", () => {
  it("creates a short HTTPS QR and forwards a board-authorized reconnect binding", async () => {
    mock.rpc.mockResolvedValue({
      data: { id: id(7), expiresAt: "2026-09-30T12:05:00Z" },
      error: null,
    });
    const response = await pairingRequest(
      request({ action: "create", presentationId: id(1) }),
      "board",
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pairingUrl).toBe(`${origin}/guru?pair=${body.code}`);
    expect(mock.rpc.mock.calls[0]?.[1].p_input).toMatchObject({
      presentationId: id(1),
    });
    expect(mock.rpc.mock.calls[0]?.[1].p_input).not.toHaveProperty("code");
    expect(mock.sample).not.toHaveBeenCalled();
  });
  it.each(["claim", "publish", "revoke", "heartbeat"])(
    "gates teacher %s with the shared sample controller before RPC",
    async (action) => {
      mock.sample.mockRejectedValue(new Error("CONFLICT"));
      const data =
        action === "claim"
          ? {
              action,
              code: "123456",
              classId: id(10),
              sessionId: id(11),
              payload,
            }
          : action === "publish"
            ? {
                action,
                presentationId: id(1),
                channelEpoch: id(2),
                baseRevision: 3,
                commandId: id(12),
                payload,
              }
            : { action, presentationId: id(1) };
      const response = await pairingRequest(request(data), "teacher");
      expect(response.status).toBe(409);
      expect(mock.rpc).not.toHaveBeenCalled();
    },
  );
  it("carries the controller binding into claim while keeping it outside the public envelope", async () => {
    const response = await pairingRequest(
      request({
        action: "claim",
        code: "123456",
        classId: id(10),
        sessionId: id(11),
        controllerId: id(12),
        payload,
      }),
      "teacher",
    );
    expect(response.status).toBe(200);
    expect(mock.rpc.mock.calls[0]?.[1].p_input).toMatchObject({
      controllerId: id(12),
      sampleController: null,
      sessionId: id(11),
    });
    expect(await response.json()).toEqual(value);
  });
  it("resume is read-only and does not claim or re-publish the first question", async () => {
    mock.rpc.mockResolvedValue({ data: { snapshot: value }, error: null });
    const response = await pairingRequest(
      request({
        action: "resume",
        classId: id(10),
        sessionId: id(11),
        controllerId: id(12),
      }),
      "teacher",
    );
    expect(response.status).toBe(200);
    expect(mock.sample).not.toHaveBeenCalled();
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc.mock.calls[0]?.[1].p_action).toBe("resume");
  });
  it("rejects cross-origin requests before RPC", async () => {
    const response = await pairingRequest(
      request(
        { action: "snapshot", presentationId: id(1) },
        "https://evil.example",
      ),
      "teacher",
    );
    expect(response.status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("returns a negative receipt for a racing ACK without acknowledging an unseen revision", async () => {
    mock.rpc.mockResolvedValue({ data: { error: "CONFLICT" }, error: null });
    const response = await pairingRequest(
      request({
        action: "ack",
        presentationId: id(1),
        channelEpoch: id(2),
        commandId: id(3),
        appliedRevision: 99,
      }),
      "board",
    );
    expect(await response.json()).toEqual({ applied: false });
  });
  it("does not let the board send teacher heartbeat metadata or claim a teacher role", async () => {
    const response = await pairingRequest(
      request({
        action: "heartbeat",
        presentationId: id(1),
        controllerSeenAt: "2026-09-30T12:00:00Z",
      }),
      "board",
    );
    expect(response.status).toBe(422);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
