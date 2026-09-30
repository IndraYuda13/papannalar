"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import { Button } from "@/ui/components/button";
import { latencySummary, measuredTouches } from "@/core/tools/capabilities";
import type { BoardProfile } from "@/contracts/board-profile";
import { browserCapabilityInfo } from "./capability-storage";
const titles = [
  "Satu sentuhan",
  "Dua sentuhan bersamaan",
  "Empat sentuhan bersamaan",
  "Browser dan layar",
  "Kelancaran sentuhan",
  "Tinggi papan",
];
export function CapabilityTest({
  onComplete,
  onClose,
}: {
  onComplete: (profile: BoardProfile) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState(0),
    [passed, setPassed] = useState([false, false, false]),
    [samples, setSamples] = useState<number[]>([]),
    [height, setHeight] = useState<"normal" | "high">();
  const [info, setInfo] =
    useState<
      Pick<
        BoardProfile,
        | "pointerEvents"
        | "indexedDb"
        | "serviceWorker"
        | "width"
        | "heightPixels"
        | "browser"
        | "major"
      >
    >();
  const started = useRef<number | undefined>(undefined),
    pointers = useRef(new Map<number, number>());
  useEffect(() => {
    started.current = performance.now();
  }, []);
  function touch(event: PointerEvent<HTMLButtonElement>, zone: number) {
    if (event.pointerType !== "touch" || event.width > 80 || event.height > 80)
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, zone);
    if (new Set(pointers.current.values()).size >= [1, 2, 4][stage])
      setPassed((old) => old.map((v, i) => (i === stage ? true : v)));
  }
  function next() {
    if (stage === 2) void inspect();
    pointers.current.clear();
    setStage((s) => s + 1);
  }
  async function inspect() {
    let indexedDb = false;
    if ("indexedDB" in window) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.open("pn-capability-probe", 1);
          req.onerror = () => reject(new Error("storage"));
          req.onsuccess = () => {
            req.result.close();
            indexedDB.deleteDatabase("pn-capability-probe");
            resolve();
          };
        });
        indexedDb = true;
      } catch {
        /* Missing capability is a result, not an application failure. */
      }
    }
    setInfo({
      pointerEvents: "PointerEvent" in window,
      indexedDb,
      serviceWorker: "serviceWorker" in navigator,
      width: window.innerWidth,
      heightPixels: window.innerHeight,
      ...browserCapabilityInfo(),
    });
  }
  function sample(event: SyntheticEvent) {
    const now = event.timeStamp;
    requestAnimationFrame(() =>
      requestAnimationFrame((stamp) =>
        setSamples((old) => [...old.slice(-119), Math.max(0, stamp - now)]),
      ),
    );
  }
  function complete() {
    if (!info || !height) return;
    const summary = latencySummary(samples);
    onComplete({
      schemaVersion: 1,
      touches: info.pointerEvents
        ? measuredTouches(passed[0], passed[1], passed[2])
        : 0,
      ...info,
      samples: summary.count,
      medianMs: summary.medianMs,
      p95Ms: summary.p95Ms,
      height,
      durationSeconds: Math.min(
        86400,
        Math.round(
          (performance.now() - (started.current ?? performance.now())) / 1000,
        ),
      ),
    });
  }
  return (
    <section
      aria-label="Tes Kemampuan Papan"
      className="space-y-5 rounded-kartu border-4 border-primary bg-white p-6 text-[28px]"
    >
      <h2 className="text-[40px] font-bold">
        Tes Kemampuan Papan · {stage + 1}/6
      </h2>
      <h3 className="text-[32px]">{titles[stage]}</h3>
      {stage < 3 && (
        <>
          <p>
            Sentuh {[1, 2, 4][stage]} lingkaran dengan jari pada saat yang sama.
            Mouse tidak dihitung sebagai sentuhan.
          </p>
          <div className="flex min-h-40 flex-wrap justify-center gap-6">
            {Array.from({ length: [1, 2, 4][stage] }, (_, i) => (
              <button
                key={i}
                aria-label={`Target sentuh ${i + 1}`}
                className="size-32 touch-none rounded-full border-4 border-primary bg-pn-teal-100 text-[40px]"
                onPointerDown={(e) => touch(e, i)}
                onPointerUp={(e) => pointers.current.delete(e.pointerId)}
                onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
                onLostPointerCapture={(e) =>
                  pointers.current.delete(e.pointerId)
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p role="status">
            {passed[stage]
              ? "Sentuhan bersamaan terbaca."
              : "Belum terdeteksi."}
          </p>
          <Button size="board" disabled={!passed[stage]} onClick={next}>
            Lanjut
          </Button>{" "}
          <Button
            size="board"
            variant="outline"
            onClick={() => {
              setPassed((old) => old.map((v, i) => (i === stage ? false : v)));
              next();
            }}
          >
            Tidak tersedia · gunakan cadangan
          </Button>
        </>
      )}
      {stage === 3 && (
        <>
          <Button size="board" onClick={() => void inspect()}>
            Periksa browser dan layar
          </Button>
          {info && (
            <>
              <p>
                Pointer Events:{" "}
                {info.pointerEvents ? "tersedia" : "tidak tersedia"} ·
                IndexedDB: {info.indexedDb ? "tersedia" : "tidak tersedia"} ·
                Service worker:{" "}
                {info.serviceWorker ? "tersedia" : "tidak tersedia"} ·{" "}
                {info.width} × {info.heightPixels}
              </p>
              <Button size="board" onClick={next}>
                Lanjut
              </Button>
            </>
          )}
        </>
      )}
      {stage === 4 && (
        <>
          <p>
            Ketuk lima kali. Waktu ini mengukur event sampai frame browser,
            bukan seluruh latensi panel sentuh fisik.
          </p>
          <Button
            size="board"
            onPointerDown={sample}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") sample(e);
            }}
          >
            Ketuk untuk ukur
          </Button>
          <p role="status">
            {samples.length} sampel · p95{" "}
            {latencySummary(samples).p95Ms ?? "belum diukur"} ms
          </p>
          <Button size="board" disabled={samples.length < 5} onClick={next}>
            Lanjut
          </Button>{" "}
          <Button size="board" variant="outline" onClick={next}>
            Lewati · belum diukur
          </Button>
        </>
      )}
      {stage === 5 && (
        <>
          <p>Apakah siswa dapat menjangkau dua pertiga bawah layar?</p>
          <div className="flex flex-wrap gap-4">
            {(["normal", "high"] as const).map((value) => (
              <Button
                key={value}
                size="board"
                variant={height === value ? "default" : "outline"}
                aria-pressed={height === value}
                onClick={() => setHeight(value)}
              >
                {value === "high"
                  ? "Terlalu tinggi · setengah bawah"
                  : "Terjangkau"}
              </Button>
            ))}
          </div>
          <Button size="board" disabled={!height} onClick={complete}>
            Simpan profil papan
          </Button>
        </>
      )}
      <div>
        <Button size="board" variant="outline" onClick={onClose}>
          Tutup tes · lanjut dengan cadangan
        </Button>
      </div>
    </section>
  );
}
