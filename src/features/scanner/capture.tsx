"use client";
import { useEffect, useRef, useState } from "react";
import type { CardAnswer, CardKind } from "@/cards/layouts/layout-v1";
import type { ScanResult } from "@/workers/omr/scan";
import { Button } from "@/ui/components/button";
import {
  openCamera,
  readLocalPhoto,
  type ImageAcquisition,
} from "./acquisition";
import { createScanner, stableScan } from "./client";

export function ScanCapture({
  kind,
  roster,
  onRead,
  onManual,
  fixtures = [],
}: {
  kind: CardKind;
  roster: readonly number[];
  onRead: (result: ScanResult, source: "omr" | "demo") => void;
  onManual: () => void;
  fixtures?: readonly { attendance: number; answers: readonly CardAnswer[] }[];
}) {
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<ImageAcquisition | null>(null);
  const scanner = useRef<ReturnType<typeof createScanner> | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState(0);
  useEffect(
    () => () => {
      generation.current++;
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
    camera.current?.close();
    camera.current = null;
    setCameraOpen(false);
  }
  async function start() {
    const ticket = ++generation.current;
    try {
      const acquisition = await openCamera(video.current!);
      if (ticket !== generation.current) {
        acquisition.close();
        return;
      }
      camera.current = acquisition;
      setCameraOpen(true);
      setMessage("Arahkan seluruh kartu, termasuk empat marker sudut.");
    } catch {
      setMessage(
        "Kamera belum tersedia. Izinkan kamera pada HTTPS, pilih foto lokal, atau masukkan jawaban manual.",
      );
      setFailures((n) => n + 1);
    }
  }
  async function process(
    operation: () => Promise<ScanResult>,
    source: "omr" | "demo",
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const result = await operation();
      if (result.status === "rejected") {
        setFailures((n) => n + 1);
        setMessage(
          "Kartu belum terbaca. Dekatkan kamera, ratakan cahaya, dan pastikan jenis kartu sesuai.",
        );
      } else {
        setMessage(
          source === "demo"
            ? "Fixture sintetis terbaca. Periksa hasil di bawah."
            : "Kartu terbaca. Periksa hasil di bawah.",
        );
        onRead(result, source);
      }
    } catch {
      setFailures((n) => n + 1);
      setMessage(
        "Pembacaan belum berhasil. Pilih foto PNG/JPEG/WebP maksimal 16 MB, atau gunakan input manual.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function capture() {
    const acquisition = camera.current;
    if (!acquisition) return;
    await process(async () => {
      const first = await reader().read(
        await acquisition.capture(),
        kind,
        roster,
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      const second = await reader().read(
        await acquisition.capture(),
        kind,
        roster,
      );
      if (first.status === "accepted" && !stableScan(first, second))
        throw new Error("FRAME_UNSTABLE");
      return second;
    }, "omr");
  }
  return (
    <section
      aria-label="Pindai Kartu"
      className="space-y-3 rounded-kartu border border-pn-ink-400/40 bg-white p-4"
    >
      <h3 className="text-lg font-bold">Pindai Kartu</h3>
      <p className="text-sm text-muted-foreground">
        Pembacaan di perangkat ini. Foto tidak dikirim atau disimpan.
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
                  async () =>
                    reader().read(await readLocalPhoto(file), kind, roster),
                  "omr",
                );
            }}
          />
        </label>
        <Button variant="outline" disabled={busy} onClick={onManual}>
          Input manual
        </Button>
      </div>
      {failures >= 2 && (
        <p className="font-semibold text-pn-peringatan">
          Dua pembacaan belum berhasil. Anda dapat melanjutkan dengan input
          manual.
        </p>
      )}
      {fixtures.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">
            Input demo sintetis — tetap melalui scanner piksel
          </p>
          <div className="flex flex-wrap gap-2">
            {fixtures.map((fixture) => (
              <Button
                key={fixture.attendance}
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void process(async () => {
                    const { syntheticCard } = await import("@/cards/synthetic");
                    return reader().read(
                      syntheticCard({
                        kind,
                        attendance: fixture.attendance,
                        answers: fixture.answers,
                        skew: 6,
                        scale: 5,
                      }),
                      kind,
                      roster,
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
