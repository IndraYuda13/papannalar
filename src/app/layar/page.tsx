import type { Metadata } from "next";
import { BoardShell } from "@/features/layar/board-shell";

export const metadata: Metadata = { title: "Layar Kelas" };

export default function BoardPage() {
  return <BoardShell />;
}
