"use client";
import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/ui/components/button";
export const REFLECTION_PROMPTS = [
  "Hari ini aku belajar",
  "Ini berguna untuk",
  "Yang masih membingungkan",
] as const;
export function Reflection({
  oral = false,
  uses = [],
}: {
  oral?: boolean;
  uses?: readonly string[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>());
  function clear() {
    const surface = canvas.current;
    surface?.getContext("2d")?.clearRect(0, 0, surface.width, surface.height);
    pointers.current.clear();
  }
  useEffect(() => {
    const surface = canvas.current,
      held = pointers.current;
    const erase = () => {
      surface?.getContext("2d")?.clearRect(0, 0, surface.width, surface.height);
      held.clear();
    };
    const access = new BroadcastChannel("pn-teacher-access");
    access.onmessage = erase;
    window.addEventListener("pagehide", erase);
    return () => {
      erase();
      access.close();
      window.removeEventListener("pagehide", erase);
    };
  }, []);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) * e.currentTarget.width) / b.width,
      y: ((e.clientY - b.top) * e.currentTarget.height) / b.height,
    };
  }
  return (
    <section aria-label="Refleksi kelas" className="board-reflection text-left">
      <h1 className="text-[56px] font-bold">Refleksi</h1>
      <div className="reflection-columns">
        <div className="reflection-copy">
          <div className="space-y-4 text-[48px]">
            {REFLECTION_PROMPTS.map((text) => (
              <p key={text}>{text} …</p>
            ))}
          </div>
          {uses.length > 0 && (
            <p className="text-[32px]">
              Kegunaan yang dibahas: {uses.join(" · ")}
            </p>
          )}
          {oral ? (
            <p className="text-[40px]">
              Ceritakan secara lisan. Teman-teman mendengarkan; guru mengaitkan
              kegunaannya.
            </p>
          ) : (
            <p className="text-[32px]">
              Tulis di buku. Tiga teman boleh menulis di zona papan; tulisan
              hilang saat berpindah layar.
            </p>
          )}
        </div>
        {!oral && (
          <div className="reflection-writing">
            <canvas
              ref={canvas}
              width={1600}
              height={360}
              aria-label="Zona tulis sementara"
              className="reflection-canvas touch-none rounded-kartu border-4 border-dashed border-primary bg-white"
              onPointerDown={(e) => {
                if (e.width > 80 || e.height > 80 || pointers.current.size >= 4)
                  return;
                pointers.current.set(e.pointerId, point(e));
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const previous = pointers.current.get(e.pointerId),
                  ctx = e.currentTarget.getContext("2d");
                if (!previous || !ctx) return;
                const next = point(e);
                ctx.strokeStyle = "#0C6F71";
                ctx.lineWidth = 6;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(previous.x, previous.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
                pointers.current.set(e.pointerId, next);
              }}
              onPointerUp={(e) => pointers.current.delete(e.pointerId)}
              onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
              onLostPointerCapture={(e) => pointers.current.delete(e.pointerId)}
            />
            <Button size="board" variant="outline" onClick={clear}>
              Bersihkan zona tulis
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
