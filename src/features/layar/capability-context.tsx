"use client";
import { createContext, useContext } from "react";
import type { TouchCount } from "@/core/tools/capabilities";
export const BoardCapabilities = createContext<{
  touches: TouchCount;
  high: boolean;
  reducedMotion: boolean;
}>({ touches: 1, high: false, reducedMotion: false });
export const useBoardCapabilities = () => useContext(BoardCapabilities);
