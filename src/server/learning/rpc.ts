import "server-only";
import type { authContext } from "../auth/client";
export type LearningClient = ReturnType<typeof authContext>["client"];
export async function learningRpc(
  client: LearningClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error("UNAVAILABLE");
  if (data && typeof data === "object" && "error" in data)
    throw new Error(String(data.error));
  return data;
}
