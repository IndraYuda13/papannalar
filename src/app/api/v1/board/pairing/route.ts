import type { NextRequest } from "next/server";
import { pairingRequest } from "@/server/pairing/service";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return pairingRequest(request, "board");
}
