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
import { GroupBoard } from "@/features/library/group-board";
import { BoardContent, BoardCloseCard } from "./board-content";
import { Button } from "@/ui/components/button";
import { Sheet } from "@/ui/components/sheet";
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
import { boardProgress } from "./board-progress";
import { useBoardProgressSource } from "./board-progress-context";
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
      onReset={reset}
      onResetComplete={completeReset}
    />
  ) : (
    <p className="board-state-line" role="status">
      Sedang menyiapkan…
    </p>
  );
}

/** The board's validity window, in `--board-label` size, with no motion on the digits
 *  (friction 5): a moving glyph cannot be typed. */
function PairingCountdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  );
  useEffect(() => {
    const tick = () =>
      setLeft(
        Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
      );
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const minutes = String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = String(left % 60).padStart(2, "0");
  return (
    <p className="board-pairing-countdown" data-pairing-countdown>
      Kode berlaku {minutes}:{seconds} lagi
    </p>
  );
}

function BoardSessionWorkspace({
  resetRequest,
  onReset,
  onResetComplete,
}: {
  resetRequest?: string;
  onReset: () => void;
  onResetComplete: (requestId: string) => void;
}) {
  const [challenge, setChallenge] = useState<Challenge>();
  const [expiredCode, setExpiredCode] = useState<Challenge>();
  const [presentationId, setPresentationId] = useState<string>();
  const [envelope, setEnvelope] = useState<PresentationEnvelope>();
  const packageView = useBoardPackage(envelope);
  const progressSource = useBoardProgressSource();
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
  const [resetOpen, setResetOpen] = useState(false);
  const [recovered, setRecovered] = useState(false);
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
        setExpiredCode(undefined);
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
    const timer = setTimeout(() => {
      if (!initialized.current) {
        initialized.current = true;
        void start(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [start]);
  useEffect(() => {
    const recover = () => {
      // C6 + friction 15: reconnecting is a state change with a word, never a silent flip.
      setRecovered(true);
      const timer = window.setTimeout(() => setRecovered(false), 4000);
      if (!presentationId && !challenge && connection?.session !== "closed")
        void start(true);
      return () => window.clearTimeout(timer);
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
          setExpiredCode(undefined);
          setShowPairing(false);
        } else if (!stopped && response.expired === true) {
          // Friction 5: the previous code stays readable and a replacement is issued, with one
          // sentence naming what happened. Silently swapping the digits left a teacher typing a
          // dead code with no explanation.
          setExpiredCode(challenge);
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
  // B3: every real command from the phone produces one visible consequence on the board. The
  // beat is keyed on the applied revision, so it fires on arrival and not on every render.
  const [arrived, setArrived] = useState(false);
  const lastRevision = useRef<number | undefined>(undefined);
  useEffect(() => {
    const revision = envelope?.revision;
    if (revision === undefined) {
      lastRevision.current = undefined;
      return;
    }
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    setArrived(true);
    const timer = window.setTimeout(() => setArrived(false), 900);
    return () => window.clearTimeout(timer);
  }, [envelope?.revision]);
  // The one closed connection vocabulary (friction 6). Same words on the board and on the
  // phone; a teacher must never read two sentences for one condition. The board's set is stated
  // verbatim by INTERACTION_DELTA_V4 friction 6: `Tersambung` · `Mengikuti lewat pemeriksaan
  // berkala` · `Terputus` · `Sambungan ke layar terputus. Layar tetap menampilkan mode
  // terakhir.` — one sentence, two facts: the condition, and what still works (§9.7's rule that
  // a teacher mid-lesson must know exactly that, without an apology).
  // The two local-control states are not connection states — the board is driving itself — so
  // they are separate, and they say which of the two local situations it is.
  const stateWord = locallyControlled
    ? envelope
      ? "Kendali lokal di papan. Sambungkan HP untuk mengambil kendali."
      : "Paket offline · daftar kelompok tidak disimpan. Guru membacakan kelompok."
    : !envelope
      ? "Menunggu sesi dari HP guru."
      : !browserOnline
        ? "Sambungan ke layar terputus. Layar tetap menampilkan mode terakhir."
        : online && connection?.controller === "present"
          ? "Tersambung"
          : connection?.realtime === false
            ? "Mengikuti lewat pemeriksaan berkala"
            : "Terputus";
  // L1: the rail's position and total come from whichever source owns them on the path being
  // rendered — the run plan on the package path, the bound library item on the library path, the
  // check item's own total on a session check. `pages.length` alone is only the first of those, so
  // a library run painted `Soal 1/0` beside a header reading `Soal 5/5`.
  const progress = boardProgress({
    library: progressSource.library,
    packagePages: packageView.pages.length,
    packageIndex: packageView.index,
    state: displayed,
  });
  // B8: the session is closed. The board does not go back to pairing on its own — it shows the
  // closing card, because a lesson that just ended needs one sentence, not a login screen.
  const closed = connection?.session === "closed";
  return (
    <div className="board-workspace flex w-full min-h-0 flex-1 flex-col">
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
            onClick={() => (displayed ? setResetOpen(true) : onReset())}
          >
            <RotateCcw size={24} aria-hidden /> Reset sesi di papan
          </Button>
          <p className="text-base">
            Lepaskan papan dari sesi lama dan buat kode baru. Hasil belajar di
            HP guru tetap tersimpan.
          </p>
        </div>
        <Button
          size="board"
          variant="outline"
          onClick={(event) => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            setTesting(true);
          }}
        >
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
      {closed ? (
        <BoardCapabilities
          value={{ touches: 1, high: false, reducedMotion: false }}
        >
          <div className="board-stage">
            <BoardCloseCard
              total={packageView.pages.length}
              className="board-close"
            />
          </div>
        </BoardCapabilities>
      ) : displayed ? (
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
                  <GroupBoard
                    presentationId={envelope.presentationId}
                    channelEpoch={envelope.channelEpoch}
                    fallback={
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
        <section className="board-idle" data-beat="idle">
          <div className="board-idle-frame" data-board-safe>
            <div className="board-idle-copy">
              <p className="board-role-line" data-role-line>
                Layar Kelas menunggu sesi. Semua siswa akan melihat papan ini.
              </p>
              <h1 className="board-heading">Layar Kelas menunggu.</h1>
              {/* Friction 4: the old step 1 ("buka halaman ini") was circular — anyone reading
                  the board has already opened it. Two real steps remain. */}
              <ol className="board-idle-steps">
                <li>Buka sesi di HP guru.</li>
                <li>Pindai QR atau masukkan kode.</li>
              </ol>
              <p role="status" className="board-note">
                {message}
              </p>
              <Button
                size="board"
                variant="outline"
                onClick={() => void start()}
              >
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
                  className="board-pairing-code"
                >
                  {challenge.code.slice(0, 3)} {challenge.code.slice(3)}
                </p>
              )}
              {challenge && (
                <PairingCountdown expiresAt={challenge.expiresAt} />
              )}
              {expiredCode && (
                <div data-pairing-expired-note className="board-expired-note">
                  <p className="board-pairing-code board-pairing-code-old">
                    {expiredCode.code.slice(0, 3)} {expiredCode.code.slice(3)}
                  </p>
                  <p className="board-note">
                    Kode sebelumnya kedaluwarsa. Kode baru sudah dibuat.
                  </p>
                </div>
              )}
              <p className="board-note">
                Kode papan · masukkan dari sesi mengajar
              </p>
            </div>
          </div>
        </section>
      )}
      <footer className="board-foot" data-board-safe data-board-band>
        {/* L1 + §J.2.1: the rail paints only when a source actually resolved a position and a
            total. A zero-segment rail is not a truthful statement about a live session, and the
            old code painted one whenever the publish payload carried no `package` key — which is
            every library run. The four motion elements A2 names are marked here too, so the row
            resolves on this path as well as on the library path. */}
        {displayed && progress && (
          <div
            className="board-rail"
            data-progress-rail
            data-board-band
            data-progress-source={progress.source}
            role="group"
            aria-label={`Soal ${progress.position} dari ${progress.total}`}
          >
            <span className="board-rail-track">
              {Array.from({ length: progress.total }, (_, i) => (
                <span
                  key={i}
                  className="board-rail-segment"
                  data-state={
                    i === progress.position - 1
                      ? "current"
                      : i < progress.position - 1
                        ? "done"
                        : "pending"
                  }
                />
              ))}
            </span>
            <span className="board-rail-position">
              Soal {progress.position}/{progress.total}
            </span>
          </div>
        )}
        <p
          data-testid="board-connection"
          role="status"
          data-connected={connected ? "true" : "false"}
          data-arrived={arrived ? "true" : "false"}
          data-motion-class="C3"
          data-board-band
          data-board-state-line
          className="board-state-line"
        >
          {connected && <CircleCheck size={18} aria-hidden />}
          <span className="board-state-rule" aria-hidden />
          {recovered && !locallyControlled
            ? "Tersambung lagi. Tampilan terakhir dipulihkan."
            : stateWord}
        </p>
      </footer>
      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Akhiri sesi di papan ini?"
        consequence="Soal dan goresan di layar ditutup, dan papan siap menerima kode baru. Hasil belajar di HP guru tetap tersimpan."
        actions={
          <>
            <Button
              variant="destructive"
              onClick={() => {
                setResetOpen(false);
                onReset();
              }}
            >
              Reset papan
            </Button>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
          </>
        }
      />
    </div>
  );
}
