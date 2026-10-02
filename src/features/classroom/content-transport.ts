import {
  boardContentStatusSchema,
  publicContentRequest,
  type BoardContentRequest,
} from "../../contracts/board-content";
export class ContentTransportError extends Error {
  constructor(readonly status: number) {
    super("Public content unavailable");
  }
}
export async function contentCall(
  surface: "board" | "teacher",
  input: BoardContentRequest,
  signal?: AbortSignal,
) {
  const response = await fetch(
    surface === "board"
      ? "/api/v1/board/content"
      : "/api/v1/presentation-content",
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publicContentRequest(input)),
      signal,
    },
  );
  if (!response.ok) throw new ContentTransportError(response.status);
  return boardContentStatusSchema.parse(await response.json());
}
