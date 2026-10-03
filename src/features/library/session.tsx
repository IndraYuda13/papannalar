"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  LoaderCircle,
  Unplug,
  Monitor,
} from "lucide-react";
import { ActivityIcon } from "@/ui/components/activity-icon";
import {
  MotionSwap,
  SwipeNavigation,
} from "@/ui/components/interactive-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTeacher } from "@/features/guru/app-context";
import {
  publicLibraryItem,
  runSchema,
  runDetailSchema,
  type LibraryRun,
  type LibraryResponse,
  type LibraryAction,
} from "@/contracts/library";
import {
  publicPresentation,
  snapshotSchema,
  type PresentationState,
  type PresentationEnvelope,
} from "@/contracts/presentation";
import { usePresentationTransport } from "@/features/classroom/presentation-transport";
import { PairingCodeInput } from "@/features/classroom/pairing-scanner";
import { pairingCall } from "@/features/classroom/transport";
import { RemoteControls } from "@/features/session/remote-controls";
import { Button } from "@/ui/components/button";
import {
  libraryCache,
  pendingLibraryResponses,
  queueLibraryResponse,
} from "@/local/library";
import { ScanCapture } from "@/features/scanner/capture";
import type { CardAnswer } from "@/cards/layouts/layout-v1";
import type { CustomFormBinding } from "@/contracts/custom-form";
import { field, panel, libraryCall } from "./client";
import { StateNotice } from "@/ui/components/studio";
import { LibraryItemView } from "./item-view";
type Detail = { run: LibraryRun; responses: LibraryResponse[] };
export function SessionPage({ id }: { id: string }) {
  const { scope } = useTeacher(),
    [detail, setDetail] = useState<Detail>(),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const data = navigator.onLine
        ? runDetailSchema.parse(await libraryCall({ action: "detail", id }))
        : await libraryCache(scope, "detail", id);
      if (!data) throw new Error();
      setDetail(data);
      if (navigator.onLine) await libraryCache(scope, "detail", id, data);
    } catch {
      setMessage(
        "Sesi belum dapat dibuka. Sambungkan internet untuk memuatnya.",
      );
    }
  }, [id, scope]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  if (!detail)
    return (
      <StateNotice
        kind={message ? "error" : "loading"}
        title={message || "Memuat sesi…"}
        action={
          message ? (
            <Button onClick={() => void load()}>Coba lagi</Button>
          ) : undefined
        }
      />
    );
  return <SessionWorkspace key={id} initial={detail} />;
}
function projection(run: LibraryRun): PresentationState {
  const item = run.document.items[run.position];
  return publicPresentation({
    schemaVersion: 1,
    mode: item.kind === "interactive" ? "together" : "opening",
    question: run.position + 1,
    taskEpoch: item.id,
    groups: [],
    ...(item.kind === "interactive" ? { tool: item.tool } : {}),
  });
}
async function publishRun(env: PresentationEnvelope, next: LibraryRun) {
  return snapshotSchema.parse(
    await pairingCall("teacher", {
      action: "publish",
      presentationId: env.presentationId,
      channelEpoch: env.channelEpoch,
      baseRevision: env.revision,
      commandId: crypto.randomUUID(),
      payload: projection(next),
    }),
  );
}
export function SessionWorkspace({ initial }: { initial: Detail }) {
  const router = useRouter();
  const { scope, refresh } = useTeacher(),
    [run, setRun] = useState(initial.run),
    [responses, setResponses] = useState(initial.responses),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [closing, setClosing] = useState(false),
    [manual, setManual] = useState(false),
    [attendance, setAttendance] = useState(
      initial.run.roster[0]?.attendanceNumber ?? 1,
    ),
    [answers, setAnswers] = useState<CardAnswer[]>(
      initial.run.document.items.map(() => "?"),
    ),
    [needsReview, setReview] = useState(false),
    [pending, setPending] = useState(false);
  const mutating = useRef(false);
  const transport = usePresentationTransport({
    sessionId: run.id,
    classId: run.classId,
    initialState: () => projection(run),
  });
  const form: CustomFormBinding = {
    intent: "custom_assessment",
    formId: run.formId,
    version: run.version,
    pageIndex: 0,
    rows: run.document.items.length,
  };
  const item = run.document.items[run.position];
  const presentId = transport.snapshot?.envelope.presentationId;
  const { latestSnapshot, receive } = transport;
  const envelopeRevision = transport.snapshot?.envelope.revision,
    connected = transport.online;
  useEffect(() => {
    const synced = (event: Event) => {
      const result = runDetailSchema.safeParse(
        (event as CustomEvent<unknown>).detail,
      );
      if (result.success && result.data.run.id === run.id) {
        setRun(result.data.run);
        setResponses(result.data.responses);
        setPending(false);
        setMessage("Jawaban tersimpan di database.");
      }
    };
    window.addEventListener("pn-library-synced", synced);
    return () => window.removeEventListener("pn-library-synced", synced);
  }, [run.id]);
  useEffect(() => {
    let stopped = false;
    void pendingLibraryResponses(scope)
      .then((rows) => {
        if (stopped) return;
        const own = rows.filter((r) => r.id === run.id);
        if (own.length) setPending(true);
      })
      .catch(() => {});
    return () => {
      stopped = true;
    };
  }, [run.id, scope]);
  useEffect(() => {
    if (!presentId || !connected) return;
    const env = latestSnapshot.current?.envelope;
    if (env && env.payload.question !== run.position + 1)
      void publishRun(env, run)
        .then(receive)
        .catch(() => {});
  }, [presentId, connected, envelopeRevision, latestSnapshot, run, receive]);
  async function move(position: number) {
    if (
      mutating.current ||
      run.status !== "active" ||
      position < 0 ||
      position >= run.document.items.length
    )
      return;
    mutating.current = true;
    setBusy(true);
    setMessage("");
    try {
      const next = runSchema.parse(
        await libraryCall({
          action: "position",
          id: run.id,
          revision: run.revision,
          position,
        }),
      );
      setRun(next);
      await libraryCache(scope, "detail", run.id, { run: next, responses });
      await refresh();
    } catch {
      setMessage(
        "Perubahan belum tersampaikan. Muat ulang sesi jika perangkat lain mengubahnya.",
      );
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  function selectStudent(n: number) {
    setAttendance(n);
    const student = run.roster.find((s) => s.attendanceNumber === n),
      existing = responses.find((r) => r.studentId === student?.id);
    setAnswers(existing?.answers ?? run.document.items.map(() => "?"));
    setReview(existing?.status === "review");
  }
  async function print() {
    setBusy(true);
    try {
      const [{ createCardPdf }, font] = await Promise.all([
        import("@/cards/pdf/create"),
        fetch("/fonts/atkinson-card.woff"),
      ]);
      if (!font.ok) throw new Error();
      const bytes = await createCardPdf(
        "weekly",
        new Uint8Array(await font.arrayBuffer()),
        form,
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `kartu-nalar-${run.classLabel}-${run.date}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Kartu siap. Cetak ukuran asli 100%; gunakan untuk asesmen ini.",
      );
    } catch {
      setMessage(
        "Kartu belum dapat dibuat. Periksa font tersimpan dan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveResponse() {
    if (mutating.current) return;
    const student = run.roster.find((s) => s.attendanceNumber === attendance);
    if (!student) return;
    mutating.current = true;
    setBusy(true);
    const old = responses.find((r) => r.studentId === student.id);
    setMessage("");
    const action: Extract<LibraryAction, { action: "response" }> = {
      action: "response",
      id: run.id,
      formId: run.formId,
      pageIndex: 0,
      version: run.version,
      studentId: student.id,
      answers,
      revision: old?.revision ?? 0,
      status: needsReview ? "review" : "received",
    };
    try {
      if (!navigator.onLine) {
        await queueLibraryResponse(scope, action);
        const local: LibraryResponse = {
          studentId: student.id,
          answers,
          revision: (old?.revision ?? 0) + 1,
          correct: run.document.items.filter(
            (q, i) => q.kind === "card" && q.key === answers[i],
          ).length,
          status: action.status,
        };
        const next = [
          ...responses.filter((r) => r.studentId !== student.id),
          local,
        ];
        setResponses(next);
        await libraryCache(scope, "detail", run.id, { run, responses: next });
        setPending(true);
        setMessage(
          "Tersimpan di perangkat. Jawaban dikirim saat tersambung kembali.",
        );
      } else {
        const data = runDetailSchema.parse(await libraryCall(action));
        setResponses(data.responses);
        setRun(data.run);
        await libraryCache(scope, "detail", run.id, data);
        setPending(false);
        setMessage(`Absen ${attendance}: tersimpan di database.`);
      }
      setManual(false);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "CONFLICT"
          ? "Jawaban telah berubah. Buka kembali hasil sebelum mengoreksi."
          : "Jawaban belum tersimpan. Periksa sambungan dan coba kembali.",
      );
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    if (
      mutating.current ||
      !window.confirm("Akhiri sesi? Materi dan jawaban tetap tersimpan.")
    )
      return;
    mutating.current = true;
    setBusy(true);
    setClosing(true);
    setMessage("");
    try {
      const next = runSchema.parse(
        await libraryCall({
          action: "close",
          id: run.id,
          revision: run.revision,
        }),
      );
      setRun(next);
      // A successful close is final even if refreshing the index fails offline.
      await libraryCache(scope, "detail", run.id, {
        run: next,
        responses,
      }).catch(() => {});
      await refresh().catch(() => {});
      router.replace("/guru");
    } catch {
      setMessage(
        "Sesi belum dapat diakhiri. Periksa sambungan lalu coba lagi.",
      );
      setClosing(false);
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <Link
        href="/guru"
        className="inline-flex min-h-12 items-center text-primary"
      >
        ← Simpan & keluar
      </Link>
      <SwipeNavigation
        disabled={busy || run.status !== "active"}
        onStep={(direction) => void move(run.position + direction)}
      >
        <p className="text-sm text-primary">
          Kelas {run.classLabel} ·{" "}
          {run.mode === "assessment" ? "Cek pemahaman" : "Mengajar"}
        </p>
        <h1 className="text-[26px] leading-tight font-extrabold">
          {run.document.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {run.date.split("-").reverse().join("/")} · Soal {run.position + 1}/
          {run.document.items.length}
        </p>
      </SwipeNavigation>
      <div
        className="studio-session-progress"
        aria-label={`Soal ${run.position + 1} dari ${run.document.items.length}`}
      >
        {run.document.items.map((q, i) => (
          <span key={q.id} data-current={i <= run.position} />
        ))}
      </div>
      <div className="studio-session-grid">
        {run.status === "active" ? (
          <section
            className={`${panel} studio-session-pairing`}
            aria-label="Sambungan layar"
            data-connected={transport.connected}
          >
            <h2 className="flex items-center gap-2 font-bold">
              {transport.connected ? (
                <CircleCheck size={20} aria-hidden />
              ) : (
                <Monitor size={20} aria-hidden />
              )}
              {transport.connected ? "Layar tersambung" : "Sambungkan Layar"}
            </h2>
            <p role="status" className="text-sm" hidden={transport.connected}>
              {transport.connection?.transport === "offline"
                ? "Koneksi terputus. Menyambungkan kembali…"
                : transport.connected
                  ? "Tampilan siap dikendalikan dari HP."
                  : transport.message ||
                    "Buka Layar Kelas di papan. Pindai QR atau masukkan kodenya."}
            </p>
            {!transport.connected && (
              <PairingCodeInput
                onPair={transport.pair}
                disabled={transport.busy || busy}
              />
            )}
            {transport.snapshot && (
              <Button
                variant="outline"
                disabled={transport.busy || busy}
                onClick={() => void transport.revoke()}
              >
                <Unplug size={18} aria-hidden /> Putuskan layar
              </Button>
            )}
          </section>
        ) : (
          <p>
            Sesi selesai. Anda masih bisa membuka hasil atau mencatat lembar
            yang terlambat.
          </p>
        )}
        <section className={`${panel} studio-session-question`}>
          <MotionSwap change={item.id} className="session-question-copy">
            {item.kind !== "card" && (
              <ActivityIcon
                kind={item.kind === "writing" ? "writing" : item.tool.kind}
              />
            )}
            <p className="text-lg font-semibold">{item.prompt}</p>
          </MotionSwap>
          {item.kind === "card" && (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {item.options.map((o, i) => (
                  <li key={i}>
                    {"ABCD"[i]}. {o}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-primary">
                Kunci untuk guru: {item.key} · Baris kartu {run.position + 1}
              </p>
            </>
          )}
          <div className="session-question-navigation flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || run.position === 0 || run.status !== "active"}
              onClick={() => void move(run.position - 1)}
            >
              <ChevronLeft size={18} aria-hidden /> Sebelumnya
            </Button>
            <Button
              disabled={
                busy ||
                run.position === run.document.items.length - 1 ||
                run.status !== "active"
              }
              onClick={() => void move(run.position + 1)}
            >
              Soal berikutnya <ChevronRight size={18} aria-hidden />
            </Button>
            <Button variant="outline" onClick={() => setPreview(!preview)}>
              Preview papan
            </Button>
          </div>
          {preview && (
            <div data-library-preview className="rounded-input border p-3">
              <LibraryItemView
                item={publicLibraryItem(item)}
                row={run.position + 1}
                hidePrompt
              />
            </div>
          )}
          {transport.snapshot && item.kind === "interactive" && (
            <RemoteControls key={item.id} env={transport.snapshot.envelope} />
          )}
        </section>
      </div>
      {run.mode === "assessment" && (
        <section className={panel} aria-label="Lembar jawaban">
          <h2 className="text-xl font-bold">
            Lembar jawaban · {responses.length}/{run.roster.length} masuk
          </h2>
          <p className="text-sm">
            Kelas {run.classLabel} · {run.date} · {run.document.items.length}{" "}
            baris · Versi {run.version}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void print()}
          >
            Cetak kartu asesmen
          </Button>
          <ScanCapture
            kind="weekly"
            formBinding={form}
            roster={run.roster.map((s) => s.attendanceNumber)}
            onManual={() => {
              if (!mutating.current) setManual(true);
            }}
            onRead={(result) => {
              if (
                mutating.current ||
                result.status === "rejected" ||
                result.attendanceNumber === null
              )
                return;
              setAttendance(result.attendanceNumber);
              setAnswers(
                result.answers
                  .slice(0, run.document.items.length)
                  .map((r) => (r.result === "missing" ? "?" : r.result)),
              );
              setReview(result.status === "review");
              setManual(true);
            }}
          />
          {manual && (
            <form
              className="space-y-3 rounded-input bg-pn-teal-100 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void saveResponse();
              }}
            >
              <h3 className="font-bold">Periksa jawaban</h3>
              <label className="block">
                Nomor absen
                <select
                  className={field}
                  value={attendance}
                  disabled={busy}
                  onChange={(e) => selectStudent(Number(e.target.value))}
                >
                  {run.roster.map((s) => (
                    <option key={s.id} value={s.attendanceNumber}>
                      Absen {String(s.attendanceNumber).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {answers.map((answer, index) => (
                  <label key={index}>
                    Baris {index + 1}
                    <select
                      className={field}
                      value={answer}
                      disabled={busy}
                      onChange={(e) =>
                        setAnswers(
                          answers.map((a, i) =>
                            i === index ? (e.target.value as CardAnswer) : a,
                          ),
                        )
                      }
                    >
                      {(["A", "B", "C", "D", "?"] as const).map((c) => (
                        <option key={c} value={c}>
                          {c === "?" ? "? / Belum tahu" : c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="flex min-h-12 items-center gap-3">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={needsReview}
                  onChange={(e) => setReview(e.target.checked)}
                />
                Masih perlu dicek
              </label>
              <Button disabled={busy}>Simpan jawaban</Button>
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={() => setManual(false)}
              >
                Batal
              </Button>
            </form>
          )}
          <p className="text-sm">
            {pending
              ? "Ada jawaban tersimpan di perangkat, menunggu sambungan."
              : "Jawaban yang diterima tersimpan di database."}
          </p>
          <Button asChild>
            <Link href={`/guru/hasil/${run.id}`}>Buka hasil tersimpan</Link>
          </Button>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        {(run.status === "active" || closing) && (
          <Button
            variant="outline"
            disabled={busy || closing}
            aria-busy={closing}
            onClick={() => void finish()}
          >
            {closing && (
              <LoaderCircle className="pending-spinner" size={18} aria-hidden />
            )}
            {closing ? "Mengakhiri sesi…" : "Akhiri sesi"}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/guru/mulai?collection=${run.collectionId}`}>
            Gunakan di kelas lain
          </Link>
        </Button>
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
