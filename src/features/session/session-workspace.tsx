"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { AssessmentContext, SavedCard } from "@/contracts/assessment";
import type { CardChoice } from "@/core/assessment/card-response";
import { CARD_CHOICES } from "@/core/assessment/card-response";
import { DEMO_RESERVED_ATTENDANCE } from "@/content/demo/class-7b";
import { demoAnswers, DEMO_WEEKLY } from "@/content/demo/weekly";
import { createAssessmentRepository } from "@/local/assessments";
import { ScanCapture } from "@/features/scanner/capture";
import { createDemoContext, deriveSession } from "./demo-session";
import { Button } from "@/ui/components/button";
import type { CardAnswer } from "@/cards/layouts/layout-v1";
import { PresentationControls } from "./presentation-controls";

type Draft = {
  attendance: number;
  choices: CardChoice[];
  source: "omr" | "manual" | "demo";
  revision: number;
  review: boolean;
};
const field = "min-h-12 rounded-input border border-pn-ink-400 bg-white px-3";
export function SessionWorkspace({
  ownerId,
  mode,
  detail,
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  detail?: { class: ClassDto; students: StudentDto[] };
}) {
  const [context, setContext] = useState<AssessmentContext>();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [draft, setDraft] = useState<Draft>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    const repo = createAssessmentRepository({ ownerId, mode });
    void repo
      .list()
      .then(async (sessions) => {
        sessions = sessions.filter((s) => !s.parentSessionId && !s.packageId);
        const selected = detail
          ? sessions.find((s) => s.classroom.id === detail.class.id)
          : sessions.at(-1);
        if (!selected) return;
        const saved = await repo.read(selected.id);
        if (current) {
          setContext(saved.context);
          setCards(saved.cards);
        }
      })
      .catch(() => {
        if (current) setMessage("Cache sesi belum dapat dibuka.");
      })
      .finally(() => repo.close());
    return () => {
      current = false;
    };
  }, [ownerId, mode, detail]);
  async function start() {
    if (!detail) return;
    setBusy(true);
    const repo = createAssessmentRepository({ ownerId, mode });
    try {
      const ctx = createDemoContext(detail.class, detail.students, () =>
        crypto.randomUUID(),
      );
      await repo.create(ctx);
      for (const student of ctx.roster)
        if (
          !DEMO_RESERVED_ATTENDANCE.includes(
            student.attendanceNumber as 7 | 12 | 25,
          )
        )
          await repo.save(ctx.id, {
            studentId: student.id,
            choices: [...demoAnswers(student.attendanceNumber)],
            source: "demo",
            expectedRevision: 0,
          });
      const saved = await repo.read(ctx.id);
      setContext(ctx);
      setCards(saved.cards);
      setMessage(
        "29 respons simulasi tersimpan. Kartu 07, 12, dan 25 belum masuk.",
      );
    } catch {
      setMessage(
        "Sesi belum siap. Periksa penyimpanan lokal dan kelas demo 7B berisi 32 siswa.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || !context) return;
    const student = context.roster.find(
      (s) => s.attendanceNumber === draft.attendance,
    );
    if (!student) return;
    const repo = createAssessmentRepository({ ownerId, mode });
    setBusy(true);
    try {
      const result = await repo.save(context.id, {
        studentId: student.id,
        choices: draft.choices,
        source: draft.source,
        expectedRevision: draft.revision,
      });
      if (result.status === "duplicate") {
        setDraft({ ...draft, revision: result.card.graded.revision });
        setMessage("Kartu sudah masuk. Pilih Ganti untuk koreksi atau Lewati.");
      } else if (result.status === "conflict")
        setMessage("Ada koreksi lain. Buka ulang sesi sebelum mengganti.");
      else {
        setCards((await repo.read(context.id)).cards);
        setDraft(undefined);
        setMessage(`Absen ${draft.attendance}: tersimpan di perangkat ini.`);
      }
    } catch {
      setMessage(
        "Belum tersimpan. Jawaban tetap di formulir; coba lagi atau periksa ruang penyimpanan.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function reset() {
    if (!context) return;
    const repo = createAssessmentRepository({ ownerId, mode });
    setBusy(true);
    try {
      await repo.remove(context.id);
      setContext(undefined);
      setCards([]);
      setDraft(undefined);
      setMessage("Sesi contoh dikosongkan. Mulai lagi dengan soal yang sama.");
    } catch {
      setMessage("Reset belum tersimpan.");
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  if (mode !== "demo") return null;
  const derived = context ? deriveSession(context, cards) : null;
  return (
    <section
      aria-label="Sesi Tepat Level"
      className="space-y-4 rounded-kartu border-2 border-primary/30 bg-pn-teal-100/30 p-4"
    >
      <h3 className="text-xl font-bold">Sesi Tepat Level · demo 7B</h3>
      <p className="text-sm">
        Data simulasi terpisah. Paket PRELIM draft; belum direview untuk pilot.
      </p>
      {!context ? (
        <Button
          onClick={() => void start()}
          disabled={
            busy ||
            !detail ||
            detail.class.count !== 32 ||
            detail.class.grade !== 7
          }
        >
          Mulai Sesi Tepat Level
        </Button>
      ) : (
        <>
          <PresentationControls
            scope={{ ownerId, mode }}
            grade={context.classroom.grade}
            roster={context.roster}
            assessmentContext={context}
            rotationGroups={derived?.grouping.groups ?? []}
            strategyCodes={Object.fromEntries(
              (derived?.grouping.groups ?? []).map((g) => [
                g.id,
                g.members.some((m) =>
                  cards.some(
                    (c) => c.studentId === m.studentId && c.choices[2] === "B",
                  ),
                ) && g.activityStep === "D1"
                  ? "D1.2"
                  : "generic-error",
              ]),
            )}
            sessionId={context.id}
            classId={context.classroom.id}
            complete={derived?.complete ?? false}
            groups={
              derived?.grouping.groups.map((g) => ({
                id: g.id,
                label: g.label,
                attendanceNumbers: g.members.map((s) => s.attendanceNumber),
              })) ?? []
            }
          />
          <p className="font-bold" data-testid="scan-count">
            {cards.length}/{context.roster.length} kartu tersimpan lokal
          </p>
          <ScanCapture
            kind="weekly"
            roster={context.roster.map((s) => s.attendanceNumber)}
            fixtures={DEMO_RESERVED_ATTENDANCE.map((attendance) => ({
              attendance,
              answers: demoAnswers(attendance) as readonly CardAnswer[],
            }))}
            onManual={() =>
              setDraft({
                attendance: 7,
                choices: [
                  "missing",
                  "missing",
                  "missing",
                  "missing",
                  "missing",
                ],
                source: "manual",
                revision: 0,
                review: true,
              })
            }
            onRead={(result, source) =>
              setDraft({
                attendance: result.attendanceNumber ?? 7,
                choices: result.answers.map((r) => r.result),
                source,
                revision: 0,
                review: result.status !== "accepted",
              })
            }
          />
          {draft && (
            <form
              onSubmit={save}
              aria-label="Review kartu"
              className="space-y-3 rounded-kartu border bg-white p-4"
            >
              <h4 className="font-bold">
                {draft.review
                  ? "Periksa isian samar/ganda"
                  : "Periksa hasil kartu"}
              </h4>
              <label className="flex items-center justify-between gap-2">
                Nomor absen
                <select
                  aria-label="Nomor absen kartu"
                  className={field}
                  value={draft.attendance}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      attendance: Number(e.target.value),
                      revision: 0,
                    })
                  }
                >
                  {context.roster.map((s) => (
                    <option key={s.id} value={s.attendanceNumber}>
                      {s.attendanceNumber}
                    </option>
                  ))}
                </select>
              </label>
              {draft.choices.map((answer, i) => (
                <label
                  key={i}
                  className="flex items-center justify-between gap-2"
                >
                  <span>Baris {i + 1}</span>
                  <select
                    aria-label={`Jawaban baris ${i + 1}`}
                    className={field}
                    value={answer}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        choices: draft.choices.map((c, j) =>
                          j === i ? (e.target.value as CardChoice) : c,
                        ),
                        source: "manual",
                      })
                    }
                  >
                    {CARD_CHOICES.map((c) => (
                      <option key={c} value={c}>
                        {c === "missing" ? "Belum terbaca" : c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p className="text-sm">
                ? berarti dipilih atau baris terbaca kosong. Belum terbaca tetap
                pending, bukan salah.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {draft.revision ? "Ganti" : "Simpan hasil"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(undefined);
                    setMessage("Kartu dilewati; bukti tidak berubah.");
                  }}
                >
                  Lewati
                </Button>
              </div>
            </form>
          )}
          <details>
            <summary className="min-h-12 cursor-pointer font-semibold">
              Soal dan hasil guru
            </summary>
            <ol className="space-y-2">
              {DEMO_WEEKLY.map((q, i) => (
                <li key={q.stepId}>
                  {i + 1}. {q.text} (
                  {q.options.map((o, j) => `${"ABCD"[j]}. ${o}`).join(" · ")})
                </li>
              ))}
            </ol>
            <ul className="mt-4 space-y-2">
              {[...cards]
                .sort(
                  (a, b) =>
                    context.roster.find((s) => s.id === a.studentId)!
                      .attendanceNumber -
                    context.roster.find((s) => s.id === b.studentId)!
                      .attendanceNumber,
                )
                .map((card) => (
                  <li key={card.id}>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          attendance: context.roster.find(
                            (s) => s.id === card.studentId,
                          )!.attendanceNumber,
                          choices: [...card.choices],
                          source: "manual",
                          revision: card.graded.revision,
                          review: true,
                        })
                      }
                    >
                      Koreksi absen{" "}
                      {
                        context.roster.find((s) => s.id === card.studentId)!
                          .attendanceNumber
                      }{" "}
                      · revisi {card.graded.revision}
                    </Button>
                  </li>
                ))}
            </ul>
          </details>
          {derived?.complete && (
            <div aria-label="Kelompok guru">
              <h4 className="font-bold">Kelompok dari displayed placement</h4>
              {derived.grouping.groups.map((g) => (
                <p key={g.id}>
                  {g.label} ·{" "}
                  {g.composition
                    .map((c) =>
                      c.placement.kind === "step"
                        ? c.placement.stepId
                        : "Lanjut",
                    )
                    .join(" + ")}{" "}
                  · {g.members.length} siswa
                </p>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => void reset()}
            disabled={busy}
          >
            Reset sesi demo lokal
          </Button>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
