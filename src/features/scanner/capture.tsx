"use client";
import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import type { CardAnswer, CardKind } from "@/cards/layouts/layout-v1";
import type { ScanResult } from "@/workers/omr/scan";
import {
  parseCustomFormBinding,
  type CustomFormBinding,
} from "@/contracts/custom-form";
import { Button } from "@/ui/components/button";
import {
  openCamera,
  readLocalPhoto,
  type ImageAcquisition,
} from "./acquisition";
import { createAutoCapture, createScanner, stableCameraScan } from "./client";

export type ScanCaptureProps = {
  kind: CardKind;
  roster: readonly number[];
  formBinding?: CustomFormBinding;
  onRead: (result: ScanResult, source: "omr" | "demo") => void;
  onManual: () => void;
  fixtures?: readonly { attendance: number; answers: readonly CardAnswer[] }[];
};

export function ScanCapture(props: ScanCaptureProps) {
  // Changing the active form/roster tears down the old camera and worker, so an
  // in-flight frame can never be delivered to a different assessment.
  const scope = JSON.stringify([
    props.kind,
    props.formBinding ?? null,
    props.roster,
  ]);
  return <CaptureSession key={scope} {...props} />;
}

function CaptureSession({
  kind,
  roster,
  formBinding,
  onRead,
  onManual,
  fixtures = [],
}: ScanCaptureProps) {
  const [binding] = useState(() =>
    formBinding === undefined ? undefined : parseCustomFormBinding(formBinding),
  );
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<ImageAcquisition | null>(null);
  const scanner = useRef<ReturnType<typeof createScanner> | null>(null);
  const automatic = useRef<ReturnType<typeof createAutoCapture> | null>(null);
  const handleRead = useRef(onRead);
  const generation = useRef(0);
  const locked = useRef(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState(0);
  useEffect(() => {
    handleRead.current = onRead;
  }, [onRead]);
  useEffect(
    () => () => {
      generation.current++;
      automatic.current?.close();
      camera.current?.close();
      scanner.current?.close();
    },
    [],
  );
  function reader() {
    scanner.current ??= createScanner();
    return scanner.current;
  }
  function stop() {
    generation.current++;
    automatic.current?.close();
    automatic.current = null;
    camera.current?.close();
    camera.current = null;
    scanner.current?.close();
    scanner.current = null;
    locked.current = false;
    setCameraOpen(false);
    setPaused(false);
    setBusy(false);
  }
  function received(result: ScanResult, source: "omr" | "demo") {
    setPaused(true);
    setFailures(0);
    setMessage(
      source === "demo"
        ? "Fixture sintetis terbaca. Periksa hasil di bawah."
        : "Kartu terbaca. Periksa hasil, lalu ketuk Lanjut pindai untuk kartu berikutnya.",
    );
    handleRead.current(result, source);
  }
  function failed() {
    setFailures((n) => Math.min(2, n + 1));
    setMessage(
      "Kartu belum terbaca. Dekatkan kamera, ratakan cahaya, dan pastikan lembar sesuai.",
    );
  }
  async function start() {
    if (locked.current || camera.current) return;
    locked.current = true;
    setBusy(true);
    const ticket = ++generation.current;
    try {
      const acquisition = await openCamera(video.current!);
      if (ticket !== generation.current) {
        acquisition.close();
        return;
      }
      camera.current = acquisition;
      const activeScanner = reader();
      setCameraOpen(true);
      setPaused(false);
      setMessage(
        "Pindai otomatis aktif. Arahkan seluruh kartu dan tahan hingga terbaca.",
      );
      automatic.current = createAutoCapture({
        read: async () =>
          activeScanner.read(
            await acquisition.capture(),
            kind,
            roster,
            binding,
          ),
        onRead: (result) => {
          if (ticket === generation.current) received(result, "omr");
        },
        onFailure: () => {
          if (ticket === generation.current) failed();
        },
      });
      automatic.current.resume();
    } catch {
      if (ticket !== generation.current) return;
      camera.current?.close();
      camera.current = null;
      scanner.current?.close();
      scanner.current = null;
      setCameraOpen(false);
      setMessage(
        "Kamera belum tersedia. Izinkan kamera pada HTTPS, pilih foto lokal, atau masukkan jawaban manual.",
      );
      setFailures((n) => n + 1);
    } finally {
      if (ticket === generation.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  async function process(
    operation: (
      activeScanner: ReturnType<typeof createScanner>,
    ) => Promise<ScanResult>,
    source: "omr" | "demo",
  ) {
    if (locked.current) return;
    const ticket = generation.current;
    locked.current = true;
    setBusy(true);
    setPaused(Boolean(camera.current));
    try {
      await automatic.current?.pause();
      if (ticket !== generation.current) return;
      const result = await operation(reader());
      if (ticket !== generation.current) return;
      if (result.status === "rejected") {
        failed();
      } else {
        received(result, source);
      }
    } catch {
      if (ticket !== generation.current) return;
      setFailures((n) => n + 1);
      setMessage(
        "Pembacaan belum berhasil. Pilih foto PNG/JPEG/WebP maksimal 16 MB, atau gunakan input manual.",
      );
    } finally {
      if (ticket === generation.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  async function capture() {
    const acquisition = camera.current;
    if (!acquisition) return;
    await process(async (activeScanner) => {
      const first = await activeScanner.read(
        await acquisition.capture(),
        kind,
        roster,
        binding,
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      const second = await activeScanner.read(
        await acquisition.capture(),
        kind,
        roster,
        binding,
      );
      if (second.status !== "rejected" && !stableCameraScan(first, second))
        throw new Error("FRAME_UNSTABLE");
      return second;
    }, "omr");
  }
  return (
    <section aria-label="Pindai Kartu" className="studio-scanner space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <ScanLine size={22} className="text-primary" aria-hidden />
        Pindai Kartu
      </h3>
      <p className="text-sm text-muted-foreground">
        Foto dibaca di perangkat ini, tanpa dikirim atau disimpan.
      </p>
      <video
        ref={video}
        muted
        playsInline
        aria-label="Pratinjau kamera"
        className={
          cameraOpen ? "max-h-80 w-full rounded-input bg-black" : "hidden"
        }
      />
      <div className="flex flex-wrap gap-2">
        {!cameraOpen ? (
          <Button disabled={busy} onClick={() => void start()}>
            Gunakan kamera
          </Button>
        ) : (
          <>
            {paused && (
              <Button
                disabled={busy}
                onClick={() => {
                  automatic.current?.resume();
                  setPaused(false);
                  setMessage(
                    "Arahkan kartu berikutnya dan tahan hingga terbaca.",
                  );
                }}
              >
                Lanjut pindai
              </Button>
            )}
            <Button disabled={busy} onClick={() => void capture()}>
              Baca kartu
            </Button>
            <Button variant="outline" onClick={stop}>
              Tutup kamera
            </Button>
          </>
        )}
        <label className="flex min-h-12 cursor-pointer items-center rounded-input border px-4 font-semibold">
          Pilih foto lokal
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void process(
                  async (activeScanner) =>
                    activeScanner.read(
                      await readLocalPhoto(file),
                      kind,
                      roster,
                      binding,
                    ),
                  "omr",
                );
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void automatic.current?.pause();
            setPaused(Boolean(camera.current));
            onManual();
          }}
        >
          Input manual
        </Button>
      </div>
      {failures >= 2 && (
        <p className="font-semibold text-pn-peringatan">
          Kartu belum terbaca. Gunakan Input manual untuk melanjutkan.
        </p>
      )}
      {fixtures.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">
            Kartu contoh · dibaca seperti foto kartu
          </p>
          <div className="flex flex-wrap gap-2">
            {fixtures.map((fixture) => (
              <Button
                key={fixture.attendance}
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void process(async (activeScanner) => {
                    const { syntheticCard } = await import("@/cards/synthetic");
                    return activeScanner.read(
                      syntheticCard({
                        kind,
                        attendance: fixture.attendance,
                        answers: fixture.answers,
                        binding,
                        skew: 6,
                        scale: 5,
                      }),
                      kind,
                      roster,
                      binding,
                    );
                  }, "demo")
                }
              >
                Fixture sintetis {String(fixture.attendance).padStart(2, "0")}
              </Button>
            ))}
          </div>
        </div>
      )}
      <p role="status" className="text-sm">
        {busy ? "Membaca kartu…" : message}
      </p>
    </section>
  );
}
