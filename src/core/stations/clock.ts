/** Midpoint estimate; reject slow/invalid samples. HTTP Date resolution is 1s. */
export function clockOffset(
  sentAt: number,
  receivedAt: number,
  serverAt: number,
): number | null {
  const latency = receivedAt - sentAt;
  if (
    ![sentAt, receivedAt, serverAt].every(Number.isFinite) ||
    latency < 0 ||
    latency > 5000
  )
    return null;
  return Math.round(serverAt - (sentAt + receivedAt) / 2);
}
