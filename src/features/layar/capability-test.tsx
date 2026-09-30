"use client";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import { Button } from "@/ui/components/button";
import { latencySummary, measuredTouches } from "@/core/tools/capabilities";
import type { BoardProfile } from "@/contracts/board-profile";
import { browserCapabilityInfo } from "./capability-storage";
import {
  initialTouchCheck,
  reduceTouchCheck,
  touchCheckDelay,
  TOUCH_RESULT_MS,
  TOUCH_STAGES,
} from "./profile-touch-check";

const titles = [
  "Satu sentuhan",
  "Dua sentuhan bersamaan",
  "Empat sentuhan bersamaan",
  "Browser dan layar",
  "Kelancaran sentuhan",
  "Tinggi papan",
];
type BrowserInfo = Pick<
  BoardProfile,
  | "pointerEvents"
  | "indexedDb"
  | "serviceWorker"
  | "width"
  | "heightPixels"
  | "browser"
  | "major"
>;

async function inspectBrowser(): Promise<BrowserInfo> {
  let indexedDb = false;
  if ("indexedDB" in window) {
    indexedDb = await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(ok);
      };
      const timeout = window.setTimeout(() => finish(false), 2000);
      try {
        const request = indexedDB.open("pn-capability-probe", 1);
        request.onerror = () => finish(false);
        request.onblocked = () => finish(false);
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase("pn-capability-probe");
          finish(true);
        };
      } catch {
        finish(false);
      }
    });
  }
  return {
    pointerEvents: "PointerEvent" in window,
    indexedDb,
    serviceWorker: "serviceWorker" in navigator,
    width: Math.min(16384, Math.max(1, window.innerWidth)),
    heightPixels: Math.min(16384, Math.max(1, window.innerHeight)),
    ...browserCapabilityInfo(),
  };
}

export function CapabilityTest({
  onComplete,
  onClose,
}: {
  onComplete: (profile: BoardProfile) => void;
  onClose: () => void;
}) {
  const [touches, dispatch] = useReducer(
    reduceTouchCheck,
    undefined,
    initialTouchCheck,
  );
  const [laterStage, setLaterStage] = useState<number>();
  const stage = laterStage ?? touches.stage;
  const [samples, setSamples] = useState<number[]>([]);
  const [height, setHeight] = useState<"normal" | "high">();
  const [info, setInfo] = useState<BrowserInfo>();
  const started = useRef<number | undefined>(undefined);
  const frames = useRef(new Set<number>());
  useEffect(() => {
    started.current = performance.now();
    const pending = frames.current;
    return () => {
      pending.forEach(cancelAnimationFrame);
      pending.clear();
    };
  }, []);
  useEffect(() => {
    const delay = touchCheckDelay(touches, performance.now());
    if (delay === null) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "tick", now: performance.now() }),
      Math.ceil(delay),
    );
    return () => window.clearTimeout(timer);
  }, [touches]);
  useEffect(() => {
    if (stage !== 3) return;
    let stopped = false;
    let timer: number | undefined;
    void inspectBrowser().then((result) => {
      if (stopped) return;
      setInfo(result);
      timer = window.setTimeout(() => setLaterStage(4), TOUCH_RESULT_MS);
    });
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [stage]);
  useEffect(() => {
    if (stage !== 4 || samples.length < 5) return;
    const timer = window.setTimeout(() => setLaterStage(5), TOUCH_RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [stage, samples.length]);

  function touch(event: PointerEvent<HTMLButtonElement>, zone: number) {
    if (event.pointerType !== "touch" || event.width > 80 || event.height > 80)
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dispatch({
      type: "down",
      id: event.pointerId,
      zone,
      pointerType: event.pointerType,
      width: event.width,
      height: event.height,
      now: event.timeStamp,
    });
  }
  function release(event: PointerEvent<HTMLButtonElement>) {
    dispatch({ type: "release", id: event.pointerId, now: event.timeStamp });
  }
  function sample(event: SyntheticEvent) {
    if (samples.length >= 5) return;
    const now = event.timeStamp;
    const first = requestAnimationFrame(() => {
      frames.current.delete(first);
      const second = requestAnimationFrame((stamp) => {
        frames.current.delete(second);
        setSamples((old) =>
          old.length < 5 ? [...old, Math.max(0, stamp - now)] : old,
        );
      });
      frames.current.add(second);
    });
    frames.current.add(first);
  }
  function complete() {
    if (!info || !height) return;
    const summary = latencySummary(samples);
    onComplete({
      schemaVersion: 1,
      touches: info.pointerEvents ? measuredTouches(...touches.passed) : 0,
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
  const observed = measuredTouches(...touches.passed);
  return (
    <section aria-label="Tes Kemampuan Papan" className="board-capability">
      <div className="board-capability-heading">
        <h2>Tes Kemampuan Papan</h2>
        <p aria-label="Progres tes">Tahap {stage + 1} dari 6</p>
      </div>
      <h3>{titles[stage]}</h3>
      {stage < 3 && (
        <>
          <p>
            Sentuh {TOUCH_STAGES[stage]} target dengan jari pada saat yang sama,
            lalu lepaskan.
          </p>
          <div className="board-touch-targets">
            {Array.from({ length: TOUCH_STAGES[stage] }, (_, i) => (
              <button
                type="button"
                key={`${stage}-${i}`}
                aria-label={`Target sentuh ${i + 1}`}
                className="board-touch-target"
                onPointerDown={(event) => touch(event, i)}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p role="status" className="board-capability-result">
            {touches.passed[stage]
              ? "✓ Sentuhan bersamaan terbaca. Lepaskan jari untuk lanjut otomatis."
              : "Menunggu sentuhan jari. Klik mouse tidak dihitung."}
          </p>
          <div className="board-capability-actions">
            <Button
              size="board"
              variant="outline"
              onClick={() => dispatch({ type: "fallback" })}
            >
              {observed === 0
                ? "Gunakan tanpa sentuhan"
                : `Lanjut dengan ${observed} sentuhan`}
            </Button>
            <p>
              HDMI hanya mengirim gambar. Mouse atau kendali HP tetap dapat
              digunakan.
            </p>
          </div>
        </>
      )}
      {stage === 3 && (
        <p role="status" className="board-capability-result">
          {!info
            ? "Memeriksa layar…"
            : info.indexedDb && info.serviceWorker
              ? "✓ Layar siap. Melanjutkan…"
              : "✓ Layar dapat digunakan. Siapkan koneksi internet untuk membuka materi."}
        </p>
      )}
      {stage === 4 && (
        <>
          <p>Ketuk lima kali untuk memeriksa kelancaran tampilan.</p>
          <Button
            size="board"
            disabled={samples.length >= 5}
            onPointerDown={sample}
            onKeyDown={(event) => {
              if (
                !event.repeat &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                sample(event);
              }
            }}
          >
            Ketuk untuk ukur
          </Button>
          <p role="status" className="board-capability-result">
            {samples.length >= 5
              ? "✓ Pemeriksaan selesai. Melanjutkan…"
              : `${samples.length} dari 5 ketukan`}
          </p>
          <Button
            size="board"
            variant="outline"
            onClick={() => setLaterStage(5)}
          >
            Lewati · belum diukur
          </Button>
        </>
      )}
      {stage === 5 && (
        <>
          <p>Apakah siswa dapat menjangkau dua pertiga bawah layar?</p>
          <div className="board-capability-actions">
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
          <p>
            Profil dipakai kembali di browser ini. Penggantian monitor dapat
            diatur lewat Ubah tampilan.
          </p>
        </>
      )}
      <footer className="board-capability-actions">
        <Button size="board" variant="outline" onClick={onClose}>
          Tutup tes · lanjut dengan cadangan
        </Button>
        {info && (
          <details className="board-capability-details">
            <summary>Detail teknis</summary>
            <p>
              Pointer Events:{" "}
              {info.pointerEvents ? "tersedia" : "tidak tersedia"} · IndexedDB:{" "}
              {info.indexedDb ? "tersedia" : "tidak tersedia"} · Service worker:{" "}
              {info.serviceWorker ? "tersedia" : "tidak tersedia"} ·{" "}
              {info.width} × {info.heightPixels}
            </p>
            <p>
              {samples.length} sampel · p95{" "}
              {latencySummary(samples).p95Ms ?? "belum diukur"} ms. Event sampai
              frame browser; bukan pengukuran panel sentuh fisik.
            </p>
          </details>
        )}
      </footer>
    </section>
  );
}
