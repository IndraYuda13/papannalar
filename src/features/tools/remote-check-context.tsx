"use client";
import { createContext, useContext } from "react";
import type { ToolModel } from "@/core/tools/patterns";
export const RemoteToolCheck = createContext<
  ((model: ToolModel) => void) | null
>(null);
export function useRemoteToolCheck() {
  return useContext(RemoteToolCheck);
}
