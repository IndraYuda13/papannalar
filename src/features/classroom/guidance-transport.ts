import {
  guidanceReportSchema,
  guidanceStatusSchema,
  type GuidanceReport,
} from "../../contracts/guidance";
export async function guidanceCall(
  surface: "teacher" | "board",
  input: GuidanceReport,
  signal?: AbortSignal,
) {
  const safe = guidanceReportSchema.parse(input);
  const body = {
    action: safe.action,
    presentationId: safe.presentationId,
    channelEpoch: safe.channelEpoch,
    taskEpoch: safe.taskEpoch,
    ...(safe.action === "ack" ? { hint: safe.hint } : {}),
  };
  const response = await fetch(
    surface === "teacher"
      ? "/api/v1/presentation-guidance"
      : "/api/v1/board/guidance",
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
  );
  if (!response.ok) throw new Error("Guidance status unavailable");
  return guidanceStatusSchema.parse(await response.json());
}
