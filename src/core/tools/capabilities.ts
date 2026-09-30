export type TouchCount = 0 | 1 | 2 | 4;
export function measuredTouches(
  single: boolean,
  dual: boolean,
  four: boolean,
): TouchCount {
  return !single ? 0 : !dual ? 1 : four ? 4 : 2;
}
export function latencySummary(samples: readonly number[]) {
  const values = samples
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 60000)
    .slice(-120)
    .sort((a, b) => a - b);
  const quantile = (q: number) =>
    values.length
      ? Math.round(values[Math.max(0, Math.ceil(q * values.length) - 1)] * 10) /
        10
      : null;
  return {
    count: values.length,
    medianMs: quantile(0.5),
    p95Ms: quantile(0.95),
  };
}
export function capabilityFallback(input: {
  touches: TouchCount;
  pointerEvents: boolean;
  indexedDb: boolean;
  serviceWorker: boolean;
  p95Ms: number | null;
  height: "normal" | "high";
}) {
  return {
    verifiedTouches: input.pointerEvents ? input.touches : (0 as TouchCount),
    together: input.pointerEvents && input.touches >= 2,
    laptop: !input.pointerEvents || !input.indexedDb || !input.serviceWorker,
    reducedMotion: input.p95Ms === null || input.p95Ms >= 500,
    lowZone: input.height === "high",
    remote: !input.pointerEvents || input.touches === 0,
  };
}
