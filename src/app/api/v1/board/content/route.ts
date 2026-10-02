import type { NextRequest } from "next/server";
import { boardContentRequest } from "@/server/board-content";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return boardContentRequest(request, "board");
}
