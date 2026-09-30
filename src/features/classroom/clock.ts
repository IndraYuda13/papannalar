import { clockOffset } from "../../core/stations/clock";
let offset = 0;
let preciseUntil = 0;
export function observeServerClock(
  date: string | null,
  sentAt: number,
  receivedAt: number,
  precise = false,
) {
  if (date === null) return;
  if (!precise && receivedAt < preciseUntil) return;
  const sample = clockOffset(sentAt, receivedAt, Date.parse(date));
  if (sample !== null) {
    offset = sample;
    if (precise) preciseUntil = receivedAt + 60_000;
  }
}
export const classroomNow = () => Math.round(Date.now() + offset);
