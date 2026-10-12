import type { NextRequest } from "next/server";
import { passwordAuth } from "@/server/auth/password";
export async function POST(request: NextRequest) {
  return passwordAuth(request, "register");
}
