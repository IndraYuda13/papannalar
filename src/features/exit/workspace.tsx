"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { LocalScope } from "@/local/scope";
import { createExitRepository } from "@/local/exit";
import { createAssessmentRepository } from "@/local/assessments";
import { createPackageRepository } from "@/local/packages";
import {
  createExitPlan,
  summarizeExit,
  exitDiagnosis,
  type ExitPlan,
} from "@/core/assessment/exit";
import { exitContext, publicExit, type PublicExit } from "@/contracts/exit";
import type { AssessmentContext, SavedCard } from "@/contracts/assessment";
import type { GroupSnapshot } from "@/core/groups/grouping";
import { CARD_CHOICES, type CardChoice } from "@/core/assessment/card-response";
import { ScanCapture } from "@/features/scanner/capture";
import { Button } from "@/ui/components/button";
import { getStep } from "@/content/ladder/registry";
import { MathPrompt } from "@/ui/components/math-prompt";
import type { TeacherPackage } from "@/core/package/build";
import { PrintCards } from "@/features/guru/print-cards";
type Draft = {
  studentId: string;
  choices: CardChoice[];
  revision: number;
  source: "omr" | "manual" | "demo";
};
export function ExitWorkspace({
  scope,
  parent,
  groups,
  onPublish,
  onSaved,
  frozenPackage,
}: {
  scope: LocalScope;
  parent: AssessmentContext;
  groups: readonly GroupSnapshot[];
  onPublish: (value: PublicExit) => Promise<void>;
  onSaved?: () => void;
  frozenPackage?: TeacherPackage;
}) {
  const [plan, setPlan] = useState<ExitPlan>(),
    [cards, setCards] = useState<SavedCard[]>([]),
    [draft, setDraft] = useState<Draft>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { ownerId, mode } = scope;
  useEffect(() => {
    let active = true;
    const exits = createExitRepository({ ownerId, mode }),
      repo = createAssessmentRepository({ ownerId, mode });
    void exits
      .read(parent.session.sessionId)
      .then(async (p) => {
        if (!p) return;
        const value = await repo.read(p.id);
        if (active) {
          setPlan(p);
          setCards(value.cards);
        }
      })
      .catch(() => {
        if (active) setMessage("Kartu cek akhir lokal belum dapat dibuka.");
      })
      .finally(() => {
        exits.close();
        repo.close();
      });
    return () => {
      active = false;
    };
  }, [ownerId, mode, parent.session.sessionId]);
  async function prepare() {
    setBusy(true);
    const packages = createPackageRepository(scope),
      exits = createExitRepository(scope);
    try {
      const p = frozenPackage ?? (await packages.latest(parent.classroom.id));
      if (!p) {
        setMessage("Siapkan soal untuk kelas ini terlebih dahulu.");
        return;
      }
      const value = createExitPlan({
        id: crypto.randomUUID(),
        sessionId: parent.session.sessionId,
        package: p,
        groups,
      });
      await exits.create(value, exitContext(value, parent));
      setPlan(value);
      setCards([]);
      setMessage(
        "Kelompok dan soal keluar dikunci. Koreksi kartu tetap memakai sesi ini.",
      );
    } catch {
      setMessage(
        "Exit belum dibekukan. Periksa paket dan kelompok; buka ulang bila sudah dibuat di tab lain.",
      );
    } finally {
      packages.close();
      exits.close();
      setBusy(false);
    }
  }
  function review(
    attendance?: number,
    choices?: readonly CardChoice[],
    source: "omr" | "manual" | "demo" = "manual",
  ) {
    if (!plan) return;
    const members = plan.groups.flatMap((g) => g.members),
      member =
        members.find((m) => m.attendanceNumber === attendance) ?? members[0],
      saved = cards.find((c) => c.studentId === member.studentId);
    setDraft({
      studentId: member.studentId,
      choices: choices
        ? [...choices]
        : saved
          ? [...saved.choices]
          : Array.from(
              { length: plan.delivery === "oral" ? 2 : 3 },
              () => "missing" as const,
            ),
      revision: choices ? 0 : (saved?.graded.revision ?? 0),
      source,
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!plan || !draft) return;
    setBusy(true);
    const repo = createAssessmentRepository(scope);
    try {
      const result = await repo.save(plan.id, {
        studentId: draft.studentId,
        choices: draft.choices,
        source: draft.source,
        expectedRevision: draft.revision,
      });
      if (result.status === "conflict")
        setMessage("Revisi berbeda. Muat ulang sebelum koreksi.");
      else if (result.status === "duplicate") {
        setDraft({ ...draft, revision: result.card.graded.revision });
        setMessage(
          "Kartu sudah masuk. Pilih Ganti hasil keluar untuk koreksi.",
        );
      } else {
        setCards((await repo.read(plan.id)).cards);
        setDraft(undefined);
        setMessage(
          "Hasil keluar tersimpan lokal. Scan ulang tidak menambah bukti.",
        );
        onSaved?.();
      }
    } catch {
      setMessage(
        "Belum tersimpan; isian tetap di formulir. Periksa penyimpanan lokal.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  const members = plan?.groups.flatMap((g) => g.members) ?? [],
    group = plan?.groups.find((g) =>
      g.members.some((s) => s.studentId === draft?.studentId),
    );
  return (
    <section
      aria-label="Hasil Kartu cek akhir"
      className="space-y-4 rounded-kartu border-2 border-primary/30 bg-white p-4"
    >
      <h4 className="text-xl font-bold">Kartu cek akhir · benar dan paham</h4>
      {plan?.delivery === "card" && (
        <PrintCards compact fixedKind="exit" count={parent.roster.length} />
      )}
      {!plan ? (
        <Button
          disabled={busy || !groups.length || scope.mode !== "demo"}
          onClick={() => void prepare()}
        >
          Siapkan pertanyaan penutup
        </Button>
      ) : (
        <>
          <p>
            {plan.delivery === "oral"
              ? "Tanyakan satu soal kepada siswa, lalu minta ia menjelaskan alasannya."
              : "Tampilkan soal kelompok. Siswa mengisi tiga baris pada kartu: jawaban, alasan, dan soal tambahan."}
          </p>
          {plan.delivery === "card" && (
            <>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((row) => (
                  <Button
                    key={row}
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      void onPublish(publicExit(plan, row)).catch(() =>
                        setMessage(
                          "Baris belum tampil; periksa sambungan papan.",
                        ),
                      );
                    }}
                  >
                    Tampilkan baris keluar {row}
                  </Button>
                ))}
              </div>
              <ScanCapture
                kind="exit"
                roster={members.map((s) => s.attendanceNumber)}
                onManual={() => review()}
                onRead={(r, source) =>
                  review(
                    r.attendanceNumber ?? undefined,
                    r.answers.map((a) => a.result),
                    source,
                  )
                }
              />
            </>
          )}
          {plan.delivery === "oral" && (
            <Button onClick={() => review()}>Cek lisan keluar siswa</Button>
          )}
          {draft && (
            <form
              aria-label="Review Kartu cek akhir"
              onSubmit={save}
              className="space-y-3 rounded-kartu border p-3"
            >
              <label>
                Nomor absen{" "}
                <select
                  aria-label="Absen keluar"
                  className="min-h-12 border p-2"
                  value={draft.studentId}
                  onChange={(e) => {
                    const saved = cards.find(
                      (c) => c.studentId === e.target.value,
                    );
                    setDraft({
                      ...draft,
                      studentId: e.target.value,
                      revision: saved?.graded.revision ?? 0,
                      choices: saved
                        ? [...saved.choices]
                        : Array.from(
                            { length: plan.delivery === "oral" ? 2 : 3 },
                            () => "missing" as const,
                          ),
                    });
                  }}
                >
                  {members.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.attendanceNumber}
                    </option>
                  ))}
                </select>
              </label>
              {plan.delivery === "oral" && group && (
                <div className="space-y-2">
                  <MathPrompt value={group.base.prompt} />
                  <p>
                    Kunci guru: {group.base.answerKey}. Alasan:{" "}
                    {group.base.reasonKey}.
                  </p>
                  {group.base.options.map((o) => (
                    <p key={o.label}>
                      {o.label}. {o.text}
                    </p>
                  ))}
                </div>
              )}
              {draft.choices.map((choice, i) => (
                <label key={i} className="block">
                  {i === 1 ? "Kenapa?" : `Jawaban ${i + 1}`}{" "}
                  <select
                    aria-label={`Keluar baris ${i + 1}`}
                    className="min-h-12 border p-2"
                    value={choice}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        source: "manual",
                        choices: draft.choices.map((v, j) =>
                          j === i ? (e.target.value as CardChoice) : v,
                        ),
                      })
                    }
                  >
                    {CARD_CHOICES.map((c) => (
                      <option key={c} value={c}>
                        {c === "missing"
                          ? "Belum terbaca"
                          : c === "?" && plan.delivery === "oral"
                            ? "Diam / belum tahu"
                            : c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {group && (
                <details>
                  <summary className="min-h-12 cursor-pointer">
                    Pilihan alasan guru
                  </summary>
                  {group.base.reasons.map((o) => (
                    <p key={o.label}>
                      {o.label}. {o.text}
                    </p>
                  ))}
                </details>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={busy}>
                  {draft.revision
                    ? "Ganti hasil keluar"
                    : "Simpan hasil keluar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(undefined)}
                >
                  Lewati kartu keluar
                </Button>
              </div>
            </form>
          )}
          <p data-testid="exit-count">
            {cards.length}/{members.length} hasil keluar tersimpan
          </p>
          <div aria-label="Ringkasan benar dan paham">
            {summarizeExit(
              plan,
              cards.map((c) => c.graded),
            ).map((row) => (
              <p key={row.stepId}>
                {getStep(row.stepId).label}:{" "}
                {row.percent === null
                  ? "belum dinilai"
                  : `${Math.round(row.percent)}% benar dan paham`}{" "}
                · {row.understood}/{row.assessed} pasangan dinilai ·{" "}
                {row.pending} jawaban belum lengkap dari {row.expected} siswa
              </p>
            ))}
          </div>
          <details>
            <summary className="min-h-12 cursor-pointer">
              Koreksi hasil keluar
            </summary>
            {cards.map((c) => (
              <p key={c.id}>
                <Button
                  variant="outline"
                  onClick={() =>
                    review(
                      members.find((s) => s.studentId === c.studentId)
                        ?.attendanceNumber,
                    )
                  }
                >
                  Koreksi keluar absen{" "}
                  {
                    members.find((s) => s.studentId === c.studentId)
                      ?.attendanceNumber
                  }
                </Button>{" "}
                {exitDiagnosis(plan, c.studentId, c.choices).join(" · ")}
              </p>
            ))}
          </details>
        </>
      )}
      <p role="status">{message}</p>
      <p className="text-sm">
        Ringkasan hasil hanya tampil pada perangkat guru. Soal ini untuk mencoba
        aplikasi dan belum diperiksa peninjau materi untuk kelas sungguhan.
      </p>
    </section>
  );
}
