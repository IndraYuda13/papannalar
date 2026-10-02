import type { NextRequest } from "next/server";
import { guidanceRequest } from "@/server/guidance";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return guidanceRequest(request, "teacher");
}
