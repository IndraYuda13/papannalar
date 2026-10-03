"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  challengeSchema,
  pairingStatusSchema,
  presentationResumeSchema,
  boardResetReceiptSchema,
  type PresentationEnvelope,
  type PresentationState,
} from "@/contracts/presentation";
import { boardIdentitySchema } from "@/contracts/auth";
import { pairingCall, watchPresentation } from "@/features/classroom/transport";
import type { PresentationConnection } from "@/features/classroom/connection-transport";
import { PairingQrCode } from "@/features/classroom/pairing-scanner";
import { LibraryBoard } from "@/features/library/board";
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
import {
  readPendingBoardReset,
  rememberBoardReset,
  finishBoardReset,
} from "./board-reset";
type Challenge = ReturnType<typeof challengeSchema.parse>;
export function BoardWorkspace() {
  const [ready, setReady] = useState(false);
  const [resetRequest, setResetRequest] = useState<string>();
  const [viewKey, setViewKey] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResetRequest(readPendingBoardReset());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const completeReset = useCallback((requestId: string) => {
    finishBoardReset(requestId);
    setResetRequest((current) => (current === requestId ? undefined : current));
  }, []);
  function reset() {
    const requestId = crypto.randomUUID();
    rememberBoardReset(requestId);
    setResetRequest(requestId);
    // Remounting cancels watchers/ACK/remote tools and clears all RAM-only ink,
    // roster and local navigation. Cached content and display settings survive.
    setViewKey((current) => current + 1);
  }
  return ready ? (
    <BoardSessionWorkspace
      key={viewKey}
      resetRequest={resetRequest}
      skipFirstUseCheck={viewKey > 0 || Boolean(resetRequest)}
      onReset={reset}
      onResetComplete={completeReset}
    />
  ) : (
    <p role="status">Menyiapkan layar…</p>
  );
}
function BoardSessionWorkspace({
  resetRequest,
  onReset,
  onResetComplete,
  skipFirstUseCheck,
}: {
  resetRequest?: string;
  onReset: () => void;
  onResetComplete: (requestId: string) => void;
  skipFirstUseCheck: boolean;
}) {
  const [skipInitialCheck] = useState(skipFirstUseCheck);
  const [challenge, setChallenge] = useState<Challenge>();
  const [presentationId, setPresentationId] = useState<string>();
  const [envelope, setEnvelope] = useState<PresentationEnvelope>();
  const packageView = useBoardPackage(envelope);
  const [heldLocal, setHeldLocal] = useState<{
    payload: PresentationState;
    revision: number;
  }>();
  const displayed =
    packageView.state ?? heldLocal?.payload ?? envelope?.payload;
  const locallyControlled = Boolean(packageView.state || heldLocal);
  const localView = useRef<PresentationState | undefined>(undefined);
  useEffect(() => {
    localView.current = locallyControlled ? displayed : undefined;
  }, [locallyControlled, displayed]);
  const [connection, setConnection] = useState<PresentationConnection>();
  const [showPairing, setShowPairing] = useState(false);
  const creating = useRef(false);
  const startController = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => startController.current?.abort(), []);
  const [online, setOnline] = useState(false),
    [message, setMessage] = useState("Menyiapkan kode pasangan…");
  const [browserOnline, setBrowserOnline] = useState(true);
  useEffect(() => {
    const refresh = () => setBrowserOnline(navigator.onLine);
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
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
      setTesting(!cached && !skipInitialCheck);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [skipInitialCheck]);
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
  const start = useCallback(
    async (resume = false) => {
      if (creating.current) return;
      if (!navigator.onLine) {
        setMessage(
          resetRequest
            ? "Soal dan goresan ditutup di papan ini. Sambungkan internet agar sesi lama diputus dan kode baru dibuat otomatis."
            : "Offline. Sambungkan internet untuk membuat pasangan; model yang sudah terbuka tetap dapat digunakan.",
        );
        return;
      }
      creating.current = true;
      const controller = new AbortController();
      startController.current = controller;
      const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(8000),
      ]);
      try {
        const response = await fetch("/api/v1/board/identity", {
          method: "POST",
          cache: "no-store",
          signal,
        });
        if (!response.ok) throw new Error("identity");
        boardIdentitySchema.parse(await response.json());
        if (resetRequest) {
          boardResetReceiptSchema.parse(
            await pairingCall(
              "board",
              { action: "reset", resetId: resetRequest },
              signal,
            ),
          );
          controller.signal.throwIfAborted();
          onResetComplete(resetRequest);
        } else if (resume) {
          const restored = presentationResumeSchema.parse(
            await pairingCall("board", { action: "resume" }, signal),
          );
          if (restored.snapshot) {
            setEnvelope(restored.snapshot.envelope);
            setPresentationId(restored.snapshot.envelope.presentationId);
            return;
          }
        }
        setChallenge(
          challengeSchema.parse(
            await pairingCall(
              "board",
              {
                action: "create",
                ...(presentationId ? { presentationId } : {}),
              },
              signal,
            ),
          ),
        );
        setShowPairing(true);
        setMessage(
          resetRequest
            ? "Sesi lama sudah dilepas dari papan. Pindai QR atau masukkan kode baru dari HP guru."
            : "Pindai QR dengan kamera HP guru, atau masukkan kode di Sambungkan Layar.",
        );
      } catch {
        if (!controller.signal.aborted)
          setMessage(
            resetRequest
              ? "Sambungan lama belum dapat diputus. Periksa internet, lalu coba lagi. Papan tetap kosong sampai reset berhasil."
              : "Kode belum tersedia. Periksa koneksi lalu coba lagi.",
          );
      } finally {
        creating.current = false;
      }
    },
    [presentationId, resetRequest, onResetComplete],
  );
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void start(true);
    }
  }, [start]);
  useEffect(() => {
    const recover = () => {
      if (!presentationId && !challenge && connection?.session !== "closed")
        void start(true);
    };
    window.addEventListener("online", recover);
    return () => window.removeEventListener("online", recover);
  }, [start, presentationId, challenge, connection?.session]);
  useEffect(() => {
    if (!challenge || !showPairing) return;
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
        if (!stopped && typeof response.presentationId === "string") {
          setPresentationId(response.presentationId);
          setChallenge(undefined);
          setShowPairing(false);
        } else if (!stopped && response.expired === true) {
          setChallenge(undefined);
          void start();
        }
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
  }, [challenge, showPairing, start]);
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
          setHeldLocal(undefined);
          setShowPairing(false);
          setMessage(
            "Sambungan berakhir. Buat kode baru untuk sesi berikutnya.",
          );
          return;
        }
        if (!rendered.current) setTesting(false);
        const old = rendered.current;
        if (
          old &&
          old.channelEpoch !== snapshot.envelope.channelEpoch &&
          localView.current
        )
          setHeldLocal({
            payload: localView.current,
            revision: snapshot.envelope.revision,
          });
        setHeldLocal((held) =>
          held && snapshot.envelope.revision > held.revision ? undefined : held,
        );
        setEnvelope((previous) =>
          previous &&
          previous.channelEpoch === snapshot.envelope.channelEpoch &&
          previous.revision >= snapshot.envelope.revision
            ? previous
            : snapshot.envelope,
        );
      },
      setOnline,
      setConnection,
    );
  }, [presentationId]);
  useEffect(() => {
    rendered.current = envelope;
    if (!envelope || locallyControlled) return;
    const controller = new AbortController();
    let pending = false;
    const ack = async () => {
      const applied = rendered.current;
      if (!applied || !navigator.onLine || pending || controller.signal.aborted)
        return;
      pending = true;
      try {
        await pairingCall(
          "board",
          {
            action: "ack",
            presentationId: applied.presentationId,
            channelEpoch: applied.channelEpoch,
            commandId: applied.commandId,
            appliedRevision: applied.revision,
          },
          controller.signal,
        );
      } catch {
        /* Recovery handles revoke and newer revisions. */
      } finally {
        pending = false;
      }
    };
    void ack();
    const timer = setInterval(() => void ack(), 2000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [envelope, locallyControlled]);
  const connected =
    !locallyControlled &&
    Boolean(envelope) &&
    browserOnline &&
    online &&
    connection?.controller === "present";
  return (
    <div className="board-workspace w-full">
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
      <details className="board-menu space-y-3 text-[26px]">
        <summary className="board-menu-trigger">
          <SlidersHorizontal size={20} aria-hidden /> Menu papan{" "}
          <ChevronDown className="board-menu-chevron" size={18} aria-hidden />
        </summary>
        <section aria-label="Status papan" className="space-y-2 text-base">
          <h2 className="font-bold">Status papan</h2>
          <p>
            {connected
              ? "HP guru tersambung. Kendali siap digunakan."
              : "Sambungkan HP guru untuk mengendalikan papan."}
          </p>
          {locallyControlled && (
            <p>
              Tampilan dikendalikan di papan. Catat giliran siswa di HP guru.
              Daftar kelompok hanya tersedia saat tersambung.
            </p>
          )}
        </section>
        <div className="space-y-2">
          <Button
            size="board"
            variant="outline"
            onClick={() => {
              if (
                !displayed ||
                window.confirm(
                  "Reset sesi di papan ini? Soal dan goresan di layar akan ditutup. Sesi dan hasil belajar di HP guru tetap tersimpan.",
                )
              )
                onReset();
            }}
          >
            <RotateCcw size={24} aria-hidden /> Reset sesi di papan
          </Button>
          <p className="text-base">
            Lepaskan papan dari sesi lama dan buat kode baru. Hasil belajar di
            HP guru tetap tersimpan.
          </p>
        </div>
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
            {!displayed && !resetRequest && (
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
          <p>Gunakan papan bergantian. Sentuhan bersama belum tersedia.</p>
        )}
        {fallback?.laptop && (
          <p>
            Browser belum lengkap. Buka Layar Kelas di laptop yang disambung ke
            papan.
          </p>
        )}
        {fallback?.reducedMotion && (
          <p>Animasi dikurangi agar papan lebih nyaman digunakan.</p>
        )}
      </details>
      <p
        data-testid="board-connection"
        role="status"
        className={
          connected ? "board-connection-badge" : "text-muted-foreground"
        }
      >
        {connected && <CircleCheck size={18} aria-hidden />}
        {locallyControlled
          ? envelope
            ? "Kendali lokal di papan. Sambungkan HP untuk mengambil kendali."
            : "Paket offline · daftar kelompok tidak disimpan. Guru membacakan kelompok."
          : envelope
            ? !browserOnline
              ? "Offline di papan. Soal tetap dapat digunakan."
              : online && connection?.controller === "present"
                ? "Tersambung"
                : "Sambungan guru sedang dipulihkan. Soal tetap dapat digunakan."
            : "Belum tersambung"}
      </p>
      {displayed && connection?.controller !== "present" && (
        <Button variant="outline" onClick={() => void start()}>
          Sambungkan kembali
        </Button>
      )}
      {showPairing && displayed && (
        <div
          className="my-4 space-y-3 rounded-kartu border p-4"
          aria-label="Sambungkan kembali ke sesi yang sama"
        >
          {challenge?.pairingUrl && (
            <PairingQrCode url={challenge.pairingUrl} />
          )}
          {challenge && (
            <p
              data-testid="pairing-code"
              className="text-[48px] tracking-widest"
            >
              {challenge.code.slice(0, 3)} {challenge.code.slice(3)}
            </p>
          )}
          <p role="status">{message}</p>
          <Button variant="outline" onClick={() => setShowPairing(false)}>
            Tutup kode
          </Button>
        </div>
      )}
      {packageView.stale && (
        <p role="alert" className="my-4 text-[32px]">
          Materi berubah saat papan offline. Pilih ulang tampilan, lalu
          sambungkan HP.
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
            className="board-stage"
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
                  <LibraryBoard
                    presentationId={envelope.presentationId}
                    revision={envelope.revision}
                    fallback={
                      <BoardContent
                        state={displayed}
                        content={packageView.content}
                        plan={packageView.plan}
                      />
                    }
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
          </div>
        </BoardCapabilities>
      ) : (
        <section className="board-idle board-idle-grid">
          <div>
            <p className="studio-eyebrow">Belajar bersama dimulai di sini</p>
            <h1 className="mb-6 text-[64px] leading-tight font-bold">
              Layar Kelas menunggu.
            </h1>
            <p className="mb-8 text-[32px]">Belum ada sesi yang ditampilkan.</p>
            <p role="status" className="mb-6">
              {message}
            </p>
            <Button size="board" variant="outline" onClick={() => void start()}>
              Buat kode baru
            </Button>
          </div>
          <div className="board-idle-code">
            {challenge?.pairingUrl && (
              <PairingQrCode url={challenge.pairingUrl} />
            )}
            {challenge && (
              <p
                data-testid="pairing-code"
                aria-label="Kode pasangan papan"
                className="my-8 font-mono text-[96px] tracking-widest"
              >
                {challenge.code.slice(0, 3)} {challenge.code.slice(3)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Kode papan · masukkan dari sesi mengajar
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
