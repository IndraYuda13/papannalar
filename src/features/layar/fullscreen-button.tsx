"use client";

import { useEffect, useState } from "react";
import { Expand, Minimize } from "lucide-react";
import { Button } from "@/ui/components/button";

export function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    setNotice("");
    if (!document.fullscreenEnabled) {
      setNotice(
        "Layar penuh belum tersedia di browser ini. Tampilan tetap dapat digunakan.",
      );
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice(
        "Layar penuh belum dapat dibuka. Tampilan tetap dapat digunakan.",
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="board"
        variant="outline"
        onClick={toggleFullscreen}
        aria-pressed={fullscreen}
      >
        {fullscreen ? (
          <Minimize aria-hidden="true" size={32} />
        ) : (
          <Expand aria-hidden="true" size={32} />
        )}
        {fullscreen ? "Keluar layar penuh" : "Layar penuh"}
      </Button>
      <p
        role="status"
        className="max-w-3xl text-center text-[26px] leading-9 text-muted-foreground"
      >
        {notice}
      </p>
    </div>
  );
}
