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
  removeLibraryCache,
} from "@/local/library";
import { ScanCapture } from "@/features/scanner/capture";
import type { CardAnswer } from "@/cards/layouts/layout-v1";
import type { CustomFormBinding } from "@/contracts/custom-form";
import { field, panel, libraryCall } from "./client";
import { StateNotice, WorkflowSteps } from "@/ui/components/studio";
import { LibraryItemView } from "./item-view";
import { useDraftGuard } from "@/ui/use-draft-guard";
import { ConflictReview } from "./conflict-review";
type Detail = { run: LibraryRun; responses: LibraryResponse[] };
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
    [answers, setAnswers] = useState<(CardAnswer | "")[]>(
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
    void libraryCache(scope, "answerDraft", initial.run.id)
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
        await libraryCache(scope, "answerDraft", run.id, {
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
    await removeLibraryCache(scope, "answerDraft", run.id);
  }
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
        void pendingLibraryResponses(scope)
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
      const next = runSchema.parse(
        await libraryCall({
          action: "position",
          id: run.id,
          revision: run.revision,
          position,
        }),
      );
      setRun(next);
      await libraryCache(scope, "detail", run.id, {
        run: next,
        responses,
      }).catch(() => {
        setMessage(
          "Soal sudah berganti. Salinan untuk penggunaan tanpa internet belum tersimpan di perangkat ini.",
        );
      });
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
    if (
      answerDirty &&
      !window.confirm("Buang perubahan jawaban yang belum disimpan?")
    )
      return;
    setAttendance(n);
    const student = run.roster.find((s) => s.attendanceNumber === n),
      existing = responses.find((r) => r.studentId === student?.id);
    setAnswers(existing?.answers ?? run.document.items.map(() => ""));
    setReview(existing?.status === "review");
    setBaseRevision(existing?.revision ?? 0);
    setAnswerDirty(false);
  }
  async function print() {
    if (mutating.current) return;
    mutating.current = true;
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
        "Kartu belum dapat diunduh. Sambungkan internet, lalu tekan Cetak kartu asesmen lagi.",
      );
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  async function saveResponse() {
    if (mutating.current || !canMutate) return;
    const completed = answers.filter((a): a is CardAnswer => a !== "");
    if (completed.length !== answers.length) {
      setMessage(
        "Periksa setiap baris yang belum diisi atau belum terbaca. Pilih ? hanya jika siswa memilih Belum tahu.",
      );
      return;
    }
    const student = run.roster.find((s) => s.attendanceNumber === attendance);
    if (!student) return;
    mutating.current = true;
    setBusy(true);
    setMessage("");
    const action: Extract<LibraryAction, { action: "response" }> = {
      action: "response",
      id: run.id,
      formId: run.formId,
      pageIndex: 0,
      version: run.version,
      studentId: student.id,
      answers: completed,
      revision: baseRevision,
      status: needsReview ? "review" : "received",
    };
    try {
      if (!navigator.onLine) {
        await queueLibraryResponse(scope, action);
        const local: LibraryResponse = {
          studentId: student.id,
          answers: completed,
          revision: baseRevision + 1,
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
        await libraryCache(scope, "detail", run.id, data).catch(
          () => undefined,
        );
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
    if (
      !canMutate ||
      (answerDirty &&
        !window.confirm(
          "Ada jawaban yang belum disimpan. Buang perubahan dan lanjut mengakhiri sesi?",
        ))
    )
      return;
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
      if (answerDirty) {
        await discardDraft().catch(() => undefined);
        setAnswerDirty(false);
      }
      router.replace(
        run.mode === "assessment" ? `/guru/hasil/${run.id}` : "/guru",
      );
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
      <WorkflowSteps
        current={run.status === "closed" ? 2 : 1}
        steps={
          run.mode === "assessment"
            ? ["Cetak kartu", "Soal & jawaban", "Lihat hasil"]
            : ["Soal siap", "Mengajar", "Akhiri sesi"]
        }
      />
      {message && (
        <p role="status" className="practice-feedback">
          {message}
        </p>
      )}
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
      <ConflictReview scope={scope} run={run} canMutate={canMutate} />
      {run.mode === "assessment" && (
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
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void print()}
          >
            Cetak kartu asesmen
          </Button>
          <fieldset disabled={!canMutate} className="min-w-0 space-y-3">
            <ScanCapture
              kind="weekly"
              formBinding={form}
              roster={run.roster.map((s) => s.attendanceNumber)}
              onManual={() => {
                if (!mutating.current && canMutate) {
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
                setAttendance(result.attendanceNumber);
                openedManual.current = true;
                setAnswers(
                  result.answers
                    .slice(0, run.document.items.length)
                    .map((r) => (r.result === "missing" ? "" : r.result)),
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
                        required
                        disabled={busy || !canMutate}
                        onChange={(e) => {
                          setAnswerDirty(true);
                          setAnswers(
                            answers.map((a, i) =>
                              i === index ? (e.target.value as CardAnswer) : a,
                            ),
                          );
                        }}
                      >
                        <option value="">Belum diisi / belum terbaca</option>
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
        {(run.status === "active" || closing) && (
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
            {run.mode === "assessment"
              ? "Catat jawaban siswa, lalu pilih Akhiri sesi untuk melihat hasil."
              : "Pilih Akhiri sesi saat kegiatan belajar selesai."}
          </p>
        )}
    </div>
  );
}
