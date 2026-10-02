"use client";
import { useState } from "react";
import type { PublicTool } from "@/contracts/tools";
import { ToolActivity } from "@/features/tools/activity";
import { Button } from "@/ui/components/button";
import type { PublicGuidance } from "@/contracts/guidance";
export function SpotlightBoard({
  tool,
  label,
  guidance,
}: {
  tool: PublicTool;
  label?: string;
  guidance?: PublicGuidance;
}) {
  const [pattern, setPattern] = useState<"watch" | "find-error">("watch");
  return (
    <section aria-label="Sorot" className="w-full space-y-5 text-left">
      <h1 className="text-[56px] font-bold">Sorot · amati, jelaskan, coba</h1>
      {label && <p className="text-[40px] font-bold">{label}</p>}
      <p className="text-[32px]">
        Contoh memakai angka berbeda. Latihan sebelumnya tetap tersimpan di
        papan ini; guru dapat kembali setelah pembahasan.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button
          size="board"
          variant="outline"
          onClick={() => setPattern("watch")}
        >
          Contoh terbimbing
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => setPattern("find-error")}
        >
          Periksa cara Nala
        </Button>
      </div>
      <ToolActivity
        key={pattern}
        task={tool}
        pattern={pattern}
        guidance={guidance}
      />
    </section>
  );
}
