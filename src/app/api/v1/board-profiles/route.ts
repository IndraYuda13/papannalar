import type { NextRequest } from "next/server";
import { boardProfileRequest } from "@/server/board-profile";
export const runtime = "nodejs";
export function GET(request: NextRequest) {
  return boardProfileRequest(request, "teacher");
}
