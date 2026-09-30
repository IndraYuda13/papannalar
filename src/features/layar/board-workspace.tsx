"use client";
import { useEffect, useRef, useState } from "react";
import {
  challengeSchema,
  pairingStatusSchema,
  type PresentationEnvelope,
} from "@/contracts/presentation";
import { boardIdentitySchema } from "@/contracts/auth";
import { pairingCall, watchPresentation } from "@/features/classroom/transport";
import { BoardContent } from "./board-content";
import { Button } from "@/ui/components/button";
import { registerUpdateGuard } from "@/offline/update-safety";
import { CapabilityTest } from "./capability-test";
import {
  readBoardProfile,
  saveBoardProfile,
  sendBoardProfile,
} from "./capability-storage";
import { BoardCapabilities } from "./capability-context";
import { capabilityFallback } from "@/core/tools/capabilities";
import type { BoardProfile } from "@/contracts/board-profile";
import { RemoteBoard } from "./remote-board";
import { useBoardPackage } from "./use-board-package";
import { BoardNavigation } from "./board-navigation";
import { HintReporting } from "./hint-reporting";
type Challenge = ReturnType<typeof challengeSchema.parse>;
export function BoardWorkspace() {
  const [challenge, setChallenge] = useState<Challenge>();
  const [presentationId, setPresentationId] = useState<string>();
  const [envelope, setEnvelope] = useState<PresentationEnvelope>();
  const packageView = useBoardPackage(envelope);
  const displayed = packageView.state ?? envelope?.payload;
  const locallyControlled = Boolean(packageView.state);
  const [online, setOnline] = useState(false),
    [message, setMessage] = useState("Menyiapkan kode pasangan…");
  const rendered = useRef<PresentationEnvelope | undefined>(undefined);
  const initialized = useRef(false);
  const [profile, setProfile] = useState<BoardProfile>(),
    [testing, setTesting] = useState(false),
    [profileNotice, setProfileNotice] = useState("");
  const fallback = profile ? capabilityFallback(profile) : undefined;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readBoardProfile();
      setProfile(cached);
      setTesting(!cached);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function completeTest(value: BoardProfile) {
    const saved = saveBoardProfile(value);
    setProfile(value);
    setTesting(false);
    setProfileNotice(
      saved
        ? "Profil disimpan di browser ini."
        : "Profil berlaku pada tab ini; penyimpanan browser tidak tersedia.",
    );
    try {
      await sendBoardProfile(value);
      setProfileNotice(
        saved
          ? "Profil tersimpan lokal dan terkirim tanpa data siswa."
          : "Profil terkirim tanpa data siswa; cache browser belum tersedia.",
      );
    } catch {
      setProfileNotice(
        "Profil berlaku lokal. Belum terkirim; gunakan kirim ulang saat online.",
      );
    }
  }
  useEffect(() => registerUpdateGuard("board", () => !rendered.current), []);
  async function start() {
    if (!navigator.onLine) {
      setMessage(
        "Offline. Sambungkan internet untuk membuat pasangan; model yang sudah terbuka tetap dapat digunakan.",
      );
      return;
    }
    try {
      const response = await fetch("/api/v1/board/identity", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("identity");
      boardIdentitySchema.parse(await response.json());
      setChallenge(
        challengeSchema.parse(await pairingCall("board", { action: "create" })),
      );
      setMessage("Masukkan kode ini di HP guru");
    } catch {
      setMessage(
        "Kode pasangan belum tersedia. Periksa koneksi dan konfigurasi server.",
      );
    }
  }
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void start();
    }
  }, []);
  useEffect(() => {
    if (!challenge || presentationId) return;
    let stopped = false,
      busy = false;
    async function poll() {
      if (busy || !navigator.onLine) return;
      busy = true;
      try {
        const response = pairingStatusSchema.parse(
          await pairingCall("board", {
            action: "status",
            challengeId: challenge!.id,
          }),
        );
        if (!stopped && typeof response.presentationId === "string")
          setPresentationId(response.presentationId);
        else if (!stopped && response.expired === true)
          setMessage("Kode kedaluwarsa. Buat kode baru.");
      } catch {
        if (!stopped) setMessage("Pairing memerlukan koneksi internet.");
      } finally {
        busy = false;
      }
    }
    const timer = setInterval(() => void poll(), 750);
    void poll();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [challenge, presentationId]);
  useEffect(() => {
    if (!presentationId) return;
    return watchPresentation(
      "board",
      presentationId,
      (snapshot) => {
        if (!snapshot) {
          setEnvelope(undefined);
          setPresentationId(undefined);
          setChallenge(undefined);
          setMessage(
            "Sambungan berakhir. Buat kode baru untuk sesi berikutnya.",
          );
          return;
        }
        if (!rendered.current) setTesting(false);
        setEnvelope((old) =>
          old && old.revision >= snapshot.envelope.revision
            ? old
            : snapshot.envelope,
        );
      },
      setOnline,
    );
  }, [presentationId]);
  useEffect(() => {
    rendered.current = locallyControlled ? undefined : envelope;
    if (!envelope || locallyControlled) return;
    const ack = async () => {
      const applied = rendered.current;
      if (!applied || !navigator.onLine) return;
      try {
        await pairingCall("board", {
          action: "ack",
          presentationId: applied.presentationId,
          channelEpoch: applied.channelEpoch,
          commandId: applied.commandId,
          appliedRevision: applied.revision,
        });
      } catch {
        /* Recovery handles revoke and newer revisions. */
      }
    };
    void ack();
    const timer = setInterval(() => void ack(), 2000);
    return () => clearInterval(timer);
  }, [envelope, locallyControlled]);
  return (
    <div className="w-full">
      {!displayed || testing ? (
        <>
          {testing && (
            <CapabilityTest
              onComplete={(value) => void completeTest(value)}
              onClose={() => setTesting(false)}
            />
          )}
        </>
      ) : null}
      <details
        open={!displayed || testing}
        className="my-4 space-y-3 text-[26px]"
      >
        <summary className="min-h-24 cursor-pointer p-6">
          Menu papan · kemampuan dan cadangan
        </summary>
        <Button size="board" variant="outline" onClick={() => setTesting(true)}>
          Tes Kemampuan Papan
        </Button>
        {profile && (
          <Button
            size="board"
            variant="outline"
            onClick={() => void completeTest(profile)}
          >
            Kirim ulang profil papan
          </Button>
        )}
        <p role="status">{profileNotice}</p>
        <p role="status" data-testid="board-cache-status">
          {packageView.notice}
        </p>
        {packageView.content && (
          <div className="space-y-4">
            {!displayed && (
              <Button size="board" onClick={() => packageView.select(0)}>
                Buka paket tersimpan
              </Button>
            )}
            {!packageView.plan?.groups.length && (
              <label className="block">
                Pilih aktivitas setelah guru membacakan kelompok
                <select
                  aria-label="Aktivitas tanpa daftar kelompok"
                  className="block min-h-24 w-full border-2 bg-white p-4 text-[28px]"
                  value={packageView.selectedActivity}
                  onChange={(e) => packageView.chooseActivity(e.target.value)}
                >
                  {packageView.content.content.activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.board[0].prompt
                        .map((n) =>
                          n.kind === "text"
                            ? n.text
                            : `${n.numerator}/${n.denominator}`,
                        )
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              size="board"
              variant="outline"
              onClick={() => void packageView.clearCache()}
            >
              Hapus cache konten
            </Button>
          </div>
        )}
        {fallback?.remote && (
          <p>
            Papan ini belum bisa disentuh. Gunakan kendali HP saat terhubung,
            atau mouse/keyboard pada laptop yang terhubung ke layar.
          </p>
        )}
        {fallback && !fallback.together && (
          <p>Pilot bergantian. Berdua serentak dimatikan.</p>
        )}
        {fallback?.laptop && (
          <p>
            Browser belum lengkap. Buka Layar Kelas di laptop yang disambung ke
            papan.
          </p>
        )}
        {fallback?.reducedMotion && (
          <p>
            Animasi dikurangi; kelancaran belum terverifikasi atau p95 ≥ 500 ms.
          </p>
        )}
      </details>
      <p
        data-testid="board-connection"
        role="status"
        className="mb-6 text-[28px] text-muted-foreground"
      >
        {locallyControlled
          ? envelope
            ? "Kendali lokal di papan. Pilih tampilan papan atau HP dari HP guru saat tersambung kembali."
            : "Paket offline · daftar kelompok tidak disimpan. Guru membacakan kelompok dan memilih aktivitas."
          : envelope
            ? online
              ? "Terhubung ke HP guru"
              : "Offline · model lokal tetap dapat digunakan. HP tidak menyinkronkan perubahan."
            : "Belum tersambung"}
      </p>
      {packageView.stale && (
        <p role="alert" className="my-4 text-[32px]">
          Paket atau kelompok berubah saat papan offline. Buka navigasi dan
          pilih ulang tampilan sebelum menyambungkan kendali HP.
        </p>
      )}
      {displayed ? (
        <BoardCapabilities
          value={{
            touches: fallback?.verifiedTouches ?? 1,
            high: fallback?.lowZone ?? false,
            reducedMotion: fallback?.reducedMotion ?? false,
          }}
        >
          <div
            hidden={testing}
            data-board-height={
              ["check", "continuation", "groups", "exit"].includes(
                displayed.mode,
              )
                ? "normal"
                : fallback?.lowZone
                  ? "high"
                  : displayed.layout?.touchZone === "sd"
                    ? "sd"
                    : "normal"
            }
            data-large-objects={
              displayed.layout?.largeObjects ? "true" : "false"
            }
            data-reduced-motion={fallback?.reducedMotion ? "true" : "false"}
          >
            <HintReporting env={envelope} enabled={!locallyControlled}>
              {envelope ? (
                <RemoteBoard env={envelope} enabled={!locallyControlled}>
                  <BoardContent
                    state={displayed}
                    content={packageView.content}
                    plan={packageView.plan}
                  />
                </RemoteBoard>
              ) : (
                <BoardContent
                  state={displayed}
                  content={packageView.content}
                  plan={packageView.plan}
                />
              )}
            </HintReporting>
            <BoardNavigation
              pages={packageView.pages}
              index={packageView.index}
              mode={displayed.mode}
              onSelect={packageView.select}
            />
            {locallyControlled && (
              <p className="mt-4 text-[26px]">
                Navigasi ini tidak mencatat giliran siswa. Konfirmasikan giliran
                yang benar-benar terjadi pada HP guru.
              </p>
            )}
          </div>
        </BoardCapabilities>
      ) : (
        <>
          <h1 className="mb-6 text-[64px] leading-tight font-bold">
            Layar Kelas menunggu.
          </h1>
          <p className="mb-8 text-[32px]">Belum ada sesi yang ditampilkan.</p>
          {challenge && (
            <p
              data-testid="pairing-code"
              aria-label="Kode pasangan papan"
              className="my-8 font-mono text-[96px] tracking-widest"
            >
              {challenge.code.slice(0, 3)} {challenge.code.slice(3)}
            </p>
          )}
          <p role="status" className="mb-8 text-[32px]">
            {message}
          </p>
          <Button size="board" variant="outline" onClick={() => void start()}>
            Buat kode baru
          </Button>
        </>
      )}
    </div>
  );
}
