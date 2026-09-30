import { clockOffset } from "@/core/stations/clock";
let offset = 0;
export function observeServerClock(
  date: string | null,
  sentAt: number,
  receivedAt: number,
) {
  if (date === null) return;
  const sample = clockOffset(sentAt, receivedAt, Date.parse(date));
  if (sample !== null) offset = sample;
}
export const classroomNow = () => Math.round(Date.now() + offset);
