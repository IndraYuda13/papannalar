import type { NextRequest } from "next/server";
import { remoteRequest } from "@/server/remote";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return remoteRequest(request, "teacher");
}
