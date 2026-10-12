"use client";
import { readLibraryDetail } from "@/features/library/read-detail";
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
  runV2Schema,
  runDetailV2Schema,
  type LibraryRunV2,
  type LibraryResponseV2,
  type LibraryV2Action,
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
import { confirmAction } from "@/ui/components/confirm";
import { pendingCardResponses } from "./pending-card-responses";
import { ScanCapture } from "@/features/scanner/capture";
import type { CardAnswer } from "@/cards/layouts/layout-v1";
import type { CustomFormBinding } from "@/contracts/custom-form";
import { field, panel } from "./client";
import { libraryV2Call, queueGroupCardResponse } from "@/local/learning-client";
import { featureCache, removeFeatureCache } from "./v2-cache";
import { z } from "zod";
import { AssignmentPrint } from "./print-assignment";
import { StateNotice, WorkflowSteps } from "@/ui/components/studio";
import { LibraryItemView } from "./item-view";
import { useDraftGuard } from "@/ui/use-draft-guard";
import { ConflictReview } from "./conflict-review";
const answerDraftSchema = z.strictObject({
  formId: z.uuid(),
  version: z.number().int().positive(),
  studentId: z.uuid(),
  answers: z
    .array(z.enum(["", "unreadable", "A", "B", "C", "D", "?"]))
    .min(1)
    .max(5),
  revision: z.number().int().nonnegative(),
  review: z.boolean(),
});
type Detail = { run: LibraryRunV2; responses: LibraryResponseV2[] };
export function SessionPage({ id }: { id: string }) {
  const { scope } = useTeacher(),
    [detail, setDetail] = useState<Detail>(),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const loaded = await readLibraryDetail(scope, id);
      setDetail(loaded.detail);
      setMessage(
        loaded.cached
          ? "Sambungan terganggu. Menampilkan jawaban yang tersimpan di perangkat ini."
          : "",
      );
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
  return (
    <div className="space-y-4">
      {message && (
        <p role="status" className="practice-feedback">
          {message}
        </p>
      )}
      <SessionWorkspace key={id} initial={detail} />
    </div>
  );
}
function projection(run: LibraryRunV2): PresentationState {
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
async function publishRun(env: PresentationEnvelope, next: LibraryRunV2) {
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
  const { scope, refresh, canMutate } = useTeacher(),
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
    [answers, setAnswers] = useState<(CardAnswer | "" | "unreadable")[]>(
      initial.run.document.items.map(() => ""),
    ),
    [needsReview, setReview] = useState(false),
    [pending, setPending] = useState(false);
  const [baseRevision, setBaseRevision] = useState(0);
  const [answerDirty, setAnswerDirty] = useState(false);
  const draftWrites = useRef(Promise.resolve());
  const openedManual = useRef(false);
  useDraftGuard(manual && answerDirty);
  useEffect(() => {
    let active = true;
    void featureCache(scope, `answerDraft:${initial.run.id}`, answerDraftSchema)
      .then((draft) => {
        const student = initial.run.roster.find(
          (s) => s.id === draft?.studentId,
        );
        if (
          !active ||
          openedManual.current ||
          !draft ||
          !student ||
          draft.formId !== initial.run.formId ||
          draft.version !== initial.run.version ||
          draft.answers.length !== initial.run.document.items.length
        )
          return;
        setAttendance(student.attendanceNumber);
        setAnswers(draft.answers);
        setReview(draft.review);
        setBaseRevision(draft.revision);
        setManual(true);
        setAnswerDirty(true);
        setMessage(
          "Ada jawaban yang belum disimpan. Periksa isian yang dipulihkan, lalu pilih Simpan jawaban atau Batal.",
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initial, scope]);
  useEffect(() => {
    if (!manual || !answerDirty) return;
    const student = run.roster.find((s) => s.attendanceNumber === attendance);
    if (!student) return;
    draftWrites.current = draftWrites.current
      .then(async () => {
        await featureCache(scope, `answerDraft:${run.id}`, answerDraftSchema, {
          formId: run.formId,
          version: run.version,
          studentId: student.id,
          answers,
          revision: baseRevision,
          review: needsReview,
        });
      })
      .catch(() =>
        setMessage(
          "Draft jawaban belum tersimpan di perangkat. Tetap di halaman ini dan pilih Simpan jawaban.",
        ),
      );
  }, [
    manual,
    answerDirty,
    run,
    scope,
    attendance,
    answers,
    baseRevision,
    needsReview,
  ]);
  async function discardDraft() {
    await draftWrites.current;
    await removeFeatureCache(scope, `answerDraft:${run.id}`);
  }
  const responseSource = useRef<"scan" | "manual">("manual");
  const mutating = useRef(false);
  const transport = usePresentationTransport({
    sessionId: run.id,
    classId: run.classId,
    initialState: () => projection(run),
  });
  useEffect(() => {
    const reload = () => {
      void readLibraryDetail(scope, run.id)
        .then((result) => {
          setRun(result.detail.run);
          setResponses(result.detail.responses);
          setPending(false);
        })
        .catch(() =>
          setMessage(
            "Jawaban telah dikirim, tetapi hasil terbaru belum dapat dimuat.",
          ),
        );
    };
    window.addEventListener("pn-cards-synced", reload);
    return () => window.removeEventListener("pn-cards-synced", reload);
  }, [scope, run.id]);
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
      const result = runDetailV2Schema.safeParse(
        (event as CustomEvent<unknown>).detail,
      );
      if (result.success && result.data.run.id === run.id) {
        setRun(result.data.run);
        setResponses(result.data.responses);
        void pendingCardResponses(scope, run.id)
          .then((rows) => setPending(rows.some((r) => r.id === run.id)))
          .catch(() => undefined);
        setMessage(
          "Jawaban tersimpan. Anda bisa melanjutkan ke siswa berikutnya.",
        );
      }
    };
    window.addEventListener("pn-library-synced", synced);
    return () => window.removeEventListener("pn-library-synced", synced);
  }, [run.id, scope]);
  useEffect(() => {
    let stopped = false;
    void pendingCardResponses(scope, run.id)
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
      !canMutate ||
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
      const next = runV2Schema.parse(
        await libraryV2Call({
          action: "position",
          id: run.id,
          revision: run.revision,
          position,
        }),
      );
      setRun(next);
      await refresh().catch(() => undefined);
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
    if (answerDirty) {
      void confirmAction({
        title: "Buang perubahan yang belum disimpan?",
        consequence:
          "Jawaban yang sudah diketik pada siswa ini hilang. Data yang sudah tersimpan tidak terpengaruh.",
        confirmLabel: "Buang perubahan",
        cancelLabel: "Tetap di sini",
        tone: "danger",
      }).then((confirmed) => {
        if (confirmed) applyStudent(n);
      });
      return;
    }
    applyStudent(n);
  }
  function applyStudent(n: number) {
    setAttendance(n);
    const student = run.roster.find((s) => s.attendanceNumber === n),
      existing = responses.find((r) => r.studentId === student?.id);
    setAnswers(
      existing?.answers.map(
        (a, i) =>
          a ?? (existing.answerStates[i] === "unreadable" ? "unreadable" : ""),
      ) ?? run.document.items.map(() => ""),
    );
    setReview(existing?.status === "review");
    setBaseRevision(existing?.revision ?? 0);
    setAnswerDirty(false);
  }
  async function saveResponse() {
    if (mutating.current || !canMutate) return;
    const completed = answers.map((a) =>
      a === "" || a === "unreadable" ? null : a,
    );
    const answerStates = answers.map((a) =>
      a === ""
        ? ("blank" as const)
        : a === "unreadable"
          ? ("unreadable" as const)
          : ("answered" as const),
    );
    const student = run.roster.find((s) => s.attendanceNumber === attendance);
    if (!student) return;
    const queued = await pendingCardResponses(scope, run.id);
    if (queued.some((r) => r.studentId === student.id)) {
      setMessage(
        "Jawaban siswa ini menunggu pengiriman. Sambungkan internet dan muat ulang sebelum mengoreksi.",
      );
      return;
    }
    mutating.current = true;
    setBusy(true);
    setMessage("");
    const action: Extract<LibraryV2Action, { action: "response" }> = {
      contractVersion: 2,
      action: "response",
      source: responseSource.current,
      answerStates,
      id: run.id,
      formId: run.formId,
      pageIndex: 0,
      version: run.version,
      studentId: student.id,
      answers: completed,
      revision: baseRevision,
      status:
        needsReview || completed.some((a) => a === null)
          ? "review"
          : "received",
    };
    try {
      if (!navigator.onLine) {
        await queueGroupCardResponse(scope, action);
        setPending(true);
        setMessage(
          "Tersimpan di perangkat. Jawaban dikirim saat tersambung kembali.",
        );
      } else {
        const data = runDetailV2Schema.parse(await libraryV2Call(action));
        setResponses(data.responses);
        setRun(data.run);

        setPending(false);
        setMessage(`Jawaban absen ${attendance} sudah tersimpan.`);
      }
      setManual(false);
      setAnswerDirty(false);
      await discardDraft().catch(() => undefined);
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
    if (!canMutate || mutating.current) return;
    // One acknowledgement for the whole action (friction 7). The unsaved-draft warning used to
    // be a second browser dialog in front of this one; it is now a sentence in the consequence,
    // because two stacked modals is a worse question than one honest one.
    const confirmed = await confirmAction({
      title: "Akhiri sesi?",
      consequence: answerDirty
        ? "Jawaban yang belum disimpan di lembar ini akan dibuang. Materi dan jawaban yang sudah tersimpan tetap aman."
        : "Papan berhenti menampilkan sesi ini. Materi dan jawaban yang sudah tersimpan tetap aman, dan hasilnya bisa dibuka dari Beranda.",
      confirmLabel: "Akhiri sesi",
      cancelLabel: "Lanjut mengajar",
      tone: answerDirty ? "danger" : "default",
    });
    if (!confirmed) return;
    mutating.current = true;
    setBusy(true);
    setClosing(true);
    setMessage("");
    try {
      const next = runV2Schema.parse(
        await libraryV2Call({
          action: "close",
          id: run.id,
          revision: run.revision,
        }),
      );
      setRun(next);
      // A successful close is final even if refreshing the index fails offline.
      await refresh().catch(() => {});
      if (answerDirty) {
        await discardDraft().catch(() => undefined);
        setAnswerDirty(false);
      }
      router.replace(`/guru/hasil/${run.id}`);
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
        ← Kembali ke beranda
      </Link>
      <SwipeNavigation
        disabled={busy || run.status !== "active"}
        onStep={(direction) => void move(run.position + direction)}
      >
        <p className="text-sm text-primary">
          Kelas {run.classLabel} ·{" "}
          {run.responseMethod === "cards" ? "Cek pemahaman" : "Mengajar"}
        </p>
        <h1 className="text-[26px] leading-tight font-extrabold">
          {run.document.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {run.date.split("-").reverse().join("/")} · Soal {run.position + 1}/
          {run.document.items.length}
        </p>
      </SwipeNavigation>
      <WorkflowSteps
        current={run.status === "closed" ? 2 : 1}
        steps={
          run.responseMethod === "cards"
            ? /* Friction 11: lesson vocabulary, subset-consistent with the conductor strip.
                 The full-lesson ladder stays on /guru/latihan; this rail is navigation for
                 the lesson, not a second app taxonomy. */
              ["Bagikan soal", "Kerjakan", "Kumpulkan"]
            : ["Siapkan soal", "Tampilkan", "Tutup sesi"]
        }
      />
      {message && (
        <p role="status" className="practice-feedback">
          {message}
        </p>
      )}
      {/* Friction 12: three states, not a boolean. "Done" and "current" used to be the same
          colour, so the strip could not answer "where am I". The difference is geometry plus
          ground, and the live region carries the words. */}
      <div
        className="studio-session-progress"
        role="group"
        aria-label={`Soal ${run.position + 1} dari ${run.document.items.length}`}
        data-session-progress
      >
        {run.document.items.map((q, i) => (
          <span
            key={q.id}
            data-state={
              i === run.position
                ? "current"
                : i < run.position
                  ? "done"
                  : "pending"
            }
          />
        ))}
        <span className="sr-only" role="status">
          Soal {run.position + 1} dari {run.document.items.length}
        </span>
      </div>
      <div className="studio-session-grid">
        {run.status === "active" && !run.parentLessonId ? (
          <section
            className={`${panel} studio-session-pairing`}
            aria-label="Sambungan layar"
            data-connected={transport.connected}
            data-motion-class="C4"
          >
            <h2 className="flex items-center gap-2 font-bold">
              {transport.connected ? (
                <CircleCheck size={20} aria-hidden />
              ) : (
                <Monitor size={20} aria-hidden />
              )}
              {transport.connected
                ? "Layar tersambung"
                : transport.snapshot
                  ? "Menunggu layar menerapkan tampilan."
                  : "Sambungkan Layar"}
            </h2>
            {/* D6 Siar: the room, seen from the phone. This is the signature screen of the
                product — the teacher can see what the class sees without turning around. */}
            {transport.snapshot && (
              <div className="studio-siar" data-siar>
                <p className="studio-siar-label">Sedang tampil di papan</p>
                <div className="studio-siar-preview" data-library-preview>
                  <LibraryItemView
                    key={`siar:${item.id}`}
                    item={publicLibraryItem(item)}
                    row={run.position + 1}
                    hidePrompt
                  />
                </div>
                <p className="studio-siar-position">
                  Soal {run.position + 1}/{run.document.items.length} · Kelas{" "}
                  {run.classLabel}
                </p>
              </div>
            )}
            <p role="status" className="text-sm" hidden={transport.connected}>
              {transport.connection?.transport === "offline"
                ? "Layar terputus. Papan tetap menampilkan tampilan terakhir."
                : transport.connected
                  ? "Tampilan siap dikendalikan dari HP."
                  : transport.message ||
                    "Buka Layar Kelas di papan. Pindai QR atau masukkan kodenya."}
            </p>
            {!transport.connected && (
              <PairingCodeInput
                onPair={transport.pair}
                disabled={!canMutate || transport.busy || busy}
              />
            )}
            {transport.snapshot && (
              <Button
                variant="outline"
                disabled={!canMutate || transport.busy || busy}
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
              disabled={
                !canMutate ||
                busy ||
                run.position === 0 ||
                run.status !== "active"
              }
              onClick={() => void move(run.position - 1)}
            >
              <ChevronLeft size={18} aria-hidden /> Sebelumnya
            </Button>
            <Button
              disabled={
                !canMutate ||
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
          {canMutate && transport.snapshot && item.kind === "interactive" && (
            <RemoteControls key={item.id} env={transport.snapshot.envelope} />
          )}
        </section>
      </div>
      {!run.parentLessonId && run.mode === "assessment" && (
        <ConflictReview scope={scope} run={run} canMutate={canMutate} />
      )}
      {run.responseMethod === "cards" && (
        <section className={panel} aria-label="Lembar jawaban">
          <h2 className="text-xl font-bold">
            Lembar jawaban · {responses.length}/{run.roster.length} masuk
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              Unduh kartu dan cetak ukuran asli (100%). Bagikan satu kartu
              kepada setiap siswa.
            </li>
            <li>
              Siswa mengisi nomor absen, lalu memilih jawaban pada{" "}
              {run.document.items.length} baris soal.
            </li>
            <li>
              Pindai kartu yang sudah diisi, atau masukkan jawabannya secara
              manual.
            </li>
          </ol>
          <AssignmentPrint run={run} />
          {/* Friction 14: the `ukuran asli 100%` instruction must be readable *before* the
              download control, not after it. A teacher who prints "sesuaikan halaman" gets
              cards the OMR worker cannot read, and the instruction arrived too late to stop
              them. `PrintScaling.None` in the PDF is untouched. */}
          <p className="studio-print-note">
            Cetak ukuran asli 100%. Jangan pilih &quot;sesuaikan halaman&quot;.
          </p>
          <fieldset disabled={!canMutate} className="min-w-0 space-y-3">
            <ScanCapture
              kind="weekly"
              formBinding={form}
              roster={run.roster.map((s) => s.attendanceNumber)}
              onManual={() => {
                if (!mutating.current && canMutate) {
                  responseSource.current = "manual";
                  openedManual.current = true;
                  selectStudent(attendance);
                  setManual(true);
                }
              }}
              onRead={(result) => {
                if (
                  !canMutate ||
                  mutating.current ||
                  result.status === "rejected" ||
                  result.attendanceNumber === null
                )
                  return;
                responseSource.current = "scan";
                setAttendance(result.attendanceNumber);
                openedManual.current = true;
                setAnswers(
                  result.answers
                    .slice(0, run.document.items.length)
                    .map((r) =>
                      r.result === "missing"
                        ? r.status === "blank"
                          ? ""
                          : "unreadable"
                        : r.result,
                    ),
                );
                const student = run.roster.find(
                  (s) => s.attendanceNumber === result.attendanceNumber,
                );
                setBaseRevision(
                  responses.find((r) => r.studentId === student?.id)
                    ?.revision ?? 0,
                );
                setAnswerDirty(true);
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
                    aria-label="Nomor absen"
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
                        aria-label={`Baris ${index + 1}`}
                        className={field}
                        value={answer}
                        disabled={busy || !canMutate}
                        onChange={(e) => {
                          setAnswerDirty(true);
                          setAnswers(
                            answers.map((a, i) =>
                              i === index
                                ? (e.target.value as
                                    CardAnswer | "" | "unreadable")
                                : a,
                            ),
                          );
                        }}
                      >
                        <option value="">Kosong</option>
                        <option value="unreadable">
                          Tidak terbaca / tanda ganda
                        </option>
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
                    onChange={(e) => {
                      setReview(e.target.checked);
                      setAnswerDirty(true);
                    }}
                  />
                  Masih perlu dicek
                </label>
                <Button disabled={busy || !canMutate}>Simpan jawaban</Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void discardDraft()
                      .then(() => {
                        setManual(false);
                        setAnswerDirty(false);
                      })
                      .catch(() =>
                        setMessage(
                          "Draft belum dapat ditutup. Coba lagi; isian tetap tersedia.",
                        ),
                      );
                  }}
                >
                  Batal
                </Button>
              </form>
            )}
          </fieldset>
          <p className="text-sm">
            {pending
              ? "Ada jawaban tersimpan di perangkat, menunggu sambungan."
              : responses.length
                ? "Jawaban sudah tersimpan. Anda bisa membuka hasilnya."
                : "Belum ada jawaban. Pindai kartu atau pilih Input manual untuk mulai mencatat."}
          </p>
          <Button asChild>
            <Link href={`/guru/hasil/${run.id}`}>Buka hasil tersimpan</Link>
          </Button>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        {!run.parentLessonId && (run.status === "active" || closing) && (
          <Button
            variant="outline"
            disabled={!canMutate || busy || closing}
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
          <Link
            href={`/guru/mulai?collection=${run.collectionId}&mode=${run.mode}`}
          >
            Gunakan di kelas lain
          </Link>
        </Button>
      </div>
      {run.status === "active" &&
        run.position === run.document.items.length - 1 && (
          <p className="text-sm text-muted-foreground">
            Ini soal terakhir.{" "}
            {run.responseMethod === "cards"
              ? "Catat jawaban siswa, lalu pilih Akhiri sesi untuk melihat hasil."
              : "Pilih Akhiri sesi saat kegiatan belajar selesai."}
          </p>
        )}
    </div>
  );
}
