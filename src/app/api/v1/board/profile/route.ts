import type { NextRequest } from "next/server";
import { boardProfileRequest } from "@/server/board-profile";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return boardProfileRequest(request, "board");
}
