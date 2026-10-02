"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVisualPreferences } from "./visual-preferences";

export type SceneAsset = "learning-board" | "balance-scale" | "algebra-kit";
function UnavailableScene({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure]);
  return null;
}
const SceneCanvas = dynamic(
  () => import("./scene-canvas").catch(() => ({ default: UnavailableScene })),
  { ssr: false },
);
const LABELS = {
  "learning-board": "Ilustrasi PapanNalar",
  "balance-scale": "Timbangan persamaan",
  "algebra-kit": "Ubin aljabar",
};
export function ToolPoster({
  asset,
  className = "",
}: {
  asset: SceneAsset;
  className?: string;
}) {
  return (
    <Image
      src={`/assets/pn-ui-v2/posters/${asset}.webp`}
      width={720}
      height={540}
      alt={LABELS[asset]}
      className={`tool-poster ${className}`}
      unoptimized
    />
  );
}
export function DecorativeScene({
  asset = "learning-board",
}: {
  asset?: SceneAsset;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false),
    [failed, setFailed] = useState(false);
  const fail = useCallback(() => {
    setFailed(true);
  }, []);
  const { ready, reduced, light, saveData } = useVisualPreferences();
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  // Wait for stored/save-data preferences before automatically loading the
  // separate renderer. Hidden/offscreen login panels keep their poster.
  const render = ready && visible && !failed && !light && !saveData;
  return (
    <figure
      ref={ref}
      className="decorative-scene"
      data-scene-state={failed ? "poster-fallback" : render ? "3d" : "poster"}
    >
      <div className="scene-frame">
        <ToolPoster asset={asset} />
        {render && (
          <SceneCanvas
            key={asset}
            asset={asset}
            reduced={reduced}
            onFailure={fail}
          />
        )}
      </div>
    </figure>
  );
}
