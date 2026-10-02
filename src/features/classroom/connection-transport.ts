import {
  connectionPulseSchema,
  snapshotSchema,
  type ConnectionPulse,
  type PresentationSnapshot,
  type PresentationEnvelope,
} from "../../contracts/presentation";

export type PresentationConnection = {
  transport: "connecting" | "online" | "offline";
  realtime: boolean;
  controller: "waiting" | "present" | "away";
  session: "active" | "closed";
};
export const CONNECTION_TIMING = {
  heartbeatMs: 5_000,
  graceMs: 15_000,
  recoveryMs: 2_000,
  healthySnapshotMs: 30_000,
  maxRetryMs: 30_000,
};
export function controllerPresent(
  pulse: ConnectionPulse,
  elapsedMs: number,
  graceMs = CONNECTION_TIMING.graceMs,
) {
  if (!pulse.controllerSeenAt) return false;
  const age =
    Date.parse(pulse.serverNow) -
    Date.parse(pulse.controllerSeenAt) +
    Math.max(0, elapsedMs);
  return Number.isFinite(age) && age >= 0 && age < graceMs;
}
export function boardAcknowledged(
  snapshot: PresentationSnapshot,
  now: number,
  graceMs = CONNECTION_TIMING.graceMs,
) {
  return (
    snapshot.ackRevision === snapshot.envelope.revision &&
    snapshot.ackCommandId === snapshot.envelope.commandId &&
    snapshot.ackAt !== null &&
    now - Date.parse(snapshot.ackAt) >= 0 &&
    now - Date.parse(snapshot.ackAt) < graceMs
  );
}
type Subscription = (
  env: PresentationEnvelope,
  wake: () => void,
  health: (healthy: boolean) => void,
  signal: AbortSignal,
) => Promise<(() => void) | undefined>;

// One scheduler and one request at a time. Realtime wakes canonical recovery;
// small heartbeats still verify revocation, controller presence and board ACK.
export function startPresentationWatch(options: {
  call: (
    action: "snapshot" | "heartbeat",
    signal: AbortSignal,
  ) => Promise<unknown>;
  subscribe: Subscription;
  onSnapshot: (snapshot: PresentationSnapshot | null) => void;
  onConnection: (value: PresentationConnection) => void;
  isOnline: () => boolean;
  isTerminal: (error: unknown) => boolean;
  graceMs?: number;
}) {
  let stopped = false,
    busy = false,
    subscribeBusy = false;
  let current: PresentationSnapshot | undefined;
  let pulse: ConnectionPulse | undefined,
    pulseAt = 0;
  let unsubscribe: (() => void) | undefined, epoch: string | undefined;
  let nextSnapshot = 0,
    nextPulse = 0,
    nextSubscribe = 0,
    retry = 1_000;
  let version = 0,
    dirty = false;
  let state: PresentationConnection = {
    transport: "connecting",
    realtime: false,
    controller: "waiting",
    session: "active",
  };
  const controller = new AbortController();
  let reported: PresentationConnection | undefined;
  let subscriptionController: AbortController | undefined;
  function report() {
    state = {
      ...state,
      controller:
        state.session === "closed"
          ? "away"
          : pulse
            ? controllerPresent(pulse, Date.now() - pulseAt, options.graceMs)
              ? "present"
              : "away"
            : "waiting",
    };
    if (
      !reported ||
      reported.transport !== state.transport ||
      reported.realtime !== state.realtime ||
      reported.controller !== state.controller ||
      reported.session !== state.session
    ) {
      reported = state;
      options.onConnection(state);
    }
  }
  function removeSubscription() {
    version++;
    subscriptionController?.abort();
    unsubscribe?.();
    unsubscribe = undefined;
    epoch = undefined;
    state = { ...state, realtime: false };
  }
  function stop() {
    stopped = true;
    clearInterval(timer);
    controller.abort();
    removeSubscription();
  }
  function fail(error: unknown) {
    if (stopped) return;
    if (options.isTerminal(error)) {
      state = { ...state, transport: "offline", session: "closed" };
      stop();
      report();
      options.onSnapshot(null);
    } else {
      state = { ...state, transport: "offline" };
      removeSubscription();
      nextPulse = nextSnapshot = Date.now() + retry;
      retry = Math.min(retry * 2, CONNECTION_TIMING.maxRetryMs);
      report();
    }
  }
  function wake() {
    if (stopped) return;
    dirty = true;
    nextSnapshot = nextPulse = 0;
    void tick();
  }
  async function subscribe() {
    if (
      stopped ||
      !current ||
      subscribeBusy ||
      Date.now() < nextSubscribe ||
      epoch === current.envelope.channelEpoch
    )
      return;
    removeSubscription();
    const generation = version,
      env = current.envelope;
    subscriptionController = new AbortController();
    subscribeBusy = true;
    nextSubscribe = Date.now() + 10_000;
    try {
      const close = await options.subscribe(
        env,
        wake,
        (healthy) => {
          if (stopped || generation !== version) return;
          state = { ...state, realtime: healthy };
          if (healthy) {
            epoch = env.channelEpoch;
            nextSnapshot = Date.now() + CONNECTION_TIMING.healthySnapshotMs;
          } else {
            nextSnapshot = 0;
            nextSubscribe = Date.now() + 2_000;
            epoch = undefined;
          }
          report();
        },
        subscriptionController.signal,
      );
      if (stopped || generation !== version) {
        close?.();
        return;
      }
      unsubscribe = close;
      if (close && state.realtime) epoch = env.channelEpoch;
    } catch (error) {
      if (options.isTerminal(error)) fail(error);
    } finally {
      subscribeBusy = false;
    }
  }
  async function tick() {
    if (stopped) return;
    if (!options.isOnline()) {
      if (state.transport !== "offline") {
        state = { ...state, transport: "offline" };
        removeSubscription();
      }
      report();
      return;
    }
    report();
    if (busy) return;
    busy = true;
    try {
      let checked = false;
      const now = Date.now();
      if (now >= nextSnapshot || dirty) {
        dirty = false;
        const snapshot = snapshotSchema.parse(
          await options.call("snapshot", controller.signal),
        );
        if (stopped) return;
        checked = true;
        if (
          current &&
          snapshot.envelope.presentationId !== current.envelope.presentationId
        )
          throw new Error("PRESENTATION_MISMATCH");
        if (
          !current ||
          snapshot.envelope.channelEpoch !== current.envelope.channelEpoch ||
          snapshot.envelope.revision >= current.envelope.revision
        ) {
          const changedEpoch =
            current &&
            current.envelope.channelEpoch !== snapshot.envelope.channelEpoch;
          current = snapshot;
          if (changedEpoch) {
            removeSubscription();
            nextSubscribe = 0;
          }
          options.onSnapshot(current);
        }
        nextSnapshot =
          Date.now() +
          (state.realtime
            ? CONNECTION_TIMING.healthySnapshotMs
            : CONNECTION_TIMING.recoveryMs);
      }
      if (Date.now() >= nextPulse) {
        const value = connectionPulseSchema.parse(
          await options.call("heartbeat", controller.signal),
        );
        if (stopped) return;
        checked = true;
        pulse = value;
        pulseAt = Date.now();
        nextPulse = pulseAt + CONNECTION_TIMING.heartbeatMs;
        if (
          current &&
          (value.channelEpoch !== current.envelope.channelEpoch ||
            value.revision !== current.envelope.revision)
        )
          dirty = true;
        else if (current) {
          current = {
            envelope: current.envelope,
            ackRevision: value.ackRevision,
            ackCommandId: value.ackCommandId,
            ackAt: value.ackAt,
          };
          options.onSnapshot(current);
        }
      }
      if (checked) {
        state = { ...state, transport: "online" };
        retry = 1_000;
      }
      report();
      if (state.transport === "online") void subscribe();
    } catch (error) {
      dirty = false;
      fail(error);
    } finally {
      busy = false;
    }
    if (dirty && !stopped && state.transport === "online") void tick();
  }
  const timer = setInterval(() => void tick(), 1_000);
  void tick();
  return { stop, wake };
}
