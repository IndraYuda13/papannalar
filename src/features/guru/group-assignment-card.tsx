"use client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type { GroupAssignment, GroupLesson } from "@/contracts/group-lesson";
import type { LibraryRunV2, Collection } from "@/contracts/library";
import { publicLibraryItem } from "@/contracts/library";
import { evidenceReasonCopy } from "./evidence-copy";
import { AssignmentPrint } from "@/features/library/print-assignment";
import { LibraryItemView } from "@/features/library/item-view";
import { field } from "@/features/library/client";
import { Section } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";

export type AssignmentInput = Pick<
  GroupAssignment,
  "id" | "groupId" | "method" | "collectionId" | "version"
>;
export const methodLabel = {
  teacher: "Dibimbing guru",
  board: "Menjawab di layar",
  cards: "Mengerjakan soal dengan kartu",
};

/**
 * One group as a fully open card: method and question set are always visible,
 * never behind a toggle. Only the member list stays collapsible, because a
 * teacher setting up a lesson needs the controls, not the roster, in sight.
 */
export function GroupAssignmentCard({
  group,
  assignment: a,
  stored,
  lesson,
  names,
  busy,
  phase,
  runs,
  printed,
  setPrinted,
  preview,
  setPreview,
  move,
  setMove,
  readyCollections,
  updateAssignment,
  commitMove,
  completeAssignment,
}: {
  group: GroupLesson["groups"][number];
  assignment?: AssignmentInput;
  stored?: GroupAssignment;
  lesson: GroupLesson;
  names: Record<string, string>;
  busy: boolean;
  phase: "prepare" | "edit" | "ready";
  runs: Record<string, LibraryRunV2>;
  printed: Record<string, boolean>;
  setPrinted: Dispatch<SetStateAction<Record<string, boolean>>>;
  preview?: string;
  setPreview: Dispatch<SetStateAction<string | undefined>>;
  move?: { studentId: string; from: string; to: string };
  setMove: Dispatch<
    SetStateAction<{ studentId: string; from: string; to: string } | undefined>
  >;
  readyCollections: Collection[];
  updateAssignment: (groupId: string, update: Partial<AssignmentInput>) => void;
  commitMove: (studentId: string, from: string, to: string) => void;
  completeAssignment: (assignmentId: string, revision: number) => void;
}) {
  const c = readyCollections.find((c) => c.id === a?.collectionId),
    document = runs[stored?.runId ?? ""]?.document ?? c?.document;
  return (
    <Section label={`${group.label} · ${group.studentIds.length} siswa`}>
      <p>
        {a ? methodLabel[a.method] : "Pilih cara belajar"} ·{" "}
        {c?.document.title ?? "Belum memilih soal"}
        {stored && lesson.status !== "draft"
          ? ` · ${stored.status === "completed" ? "Tugas selesai" : stored.status === "stopped" ? "Dihentikan" : "Berlangsung"}`
          : ""}
      </p>
      <div className="space-y-4">
        <div className="space-y-3">
          {lesson.status === "draft" && phase === "edit" ? (
            <>
              <fieldset disabled={busy}>
                <legend className="font-semibold">
                  Kelompok ini belajar bagaimana?
                </legend>
                {(["teacher", "board", "cards"] as const).map((method) => (
                  <label
                    className="flex min-h-12 items-center gap-3"
                    key={method}
                  >
                    <input
                      type="radio"
                      name={`method-${group.id}`}
                      checked={a?.method === method}
                      onChange={() => updateAssignment(group.id, { method })}
                    />
                    {methodLabel[method]}
                  </label>
                ))}
              </fieldset>
              <label className="block max-w-md">
                Soal yang dipakai
                <select
                  className={field}
                  disabled={busy}
                  value={a?.collectionId ?? ""}
                  onChange={(e) => {
                    const c = readyCollections.find(
                      (c) => c.id === e.target.value,
                    );
                    updateAssignment(group.id, {
                      collectionId: e.target.value,
                      version: c?.version ?? 1,
                    });
                  }}
                >
                  <option value="">Pilih kumpulan siap digunakan</option>
                  {(["teacher", "system"] as const).map((source) => (
                    <optgroup
                      key={source}
                      label={
                        source === "teacher" ? "Soal saya" : "Soal siap pakai"
                      }
                    >
                      {readyCollections
                        .filter((c) => c.source === source)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.document.title}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p>{stored ? methodLabel[stored.method] : "Belum ditetapkan"}</p>
          )}
          {document && (
            <>
              <p>
                {document.items.length} soal ·{" "}
                {document.kind === "cards"
                  ? "Pilihan ganda"
                  : "Alat interaktif"}{" "}
                · Versi {a?.version}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setPreview(preview === group.id ? undefined : group.id)
                }
              >
                Lihat soal
              </Button>
              {preview === group.id && (
                <div data-library-preview className="space-y-4">
                  {document.items.map((item, i) => (
                    <LibraryItemView
                      key={item.id}
                      item={publicLibraryItem(item)}
                      row={i + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {a?.method === "cards" && (
            <p>
              Kartu Nalar adalah lembar jawaban. Kelompok ini juga memerlukan
              lembar soal cetak.
            </p>
          )}
          {a?.method === "board" && (
            <p>
              Kelompok menjawab dan memilih Soal berikutnya sendiri. Jawaban
              bersama bukan nilai tiap siswa.
            </p>
          )}
          {phase === "ready" &&
            stored?.method === "cards" &&
            runs[stored.runId] && (
              <>
                <AssignmentPrint run={runs[stored.runId]} />
                <label className="flex min-h-12 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!printed[stored.id]}
                    onChange={(e) =>
                      setPrinted({
                        ...printed,
                        [stored.id]: e.target.checked,
                      })
                    }
                  />
                  Lembar soal dan kartu sudah disiapkan
                </label>
              </>
            )}
          {lesson.status !== "draft" && stored?.method === "cards" && (
            <Button asChild variant="outline">
              <Link href={`/guru/sesi/${stored.runId}`}>
                Pindai atau input jawaban
              </Link>
            </Button>
          )}
          {lesson.status === "active" &&
            stored?.method !== "board" &&
            stored?.status === "active" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => completeAssignment(stored.id, stored.revision)}
              >
                Tandai tugas selesai
              </Button>
            )}
        </div>
        <details open={phase === "ready"}>
          <summary className="min-h-12 cursor-pointer content-center font-semibold">
            Anggota kelompok ({group.studentIds.length})
          </summary>
          <ul className="mt-2">
            {group.studentIds.map((studentId) => {
              const student = lesson.presence.find((s) => s.id === studentId);
              return (
                <li key={studentId} className="border-b py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words">
                      {student?.attendanceNumber}.{" "}
                      {names[studentId] ?? `Siswa ${student?.attendanceNumber}`}
                    </span>
                    {lesson.status === "draft" && phase === "edit" && (
                      <Button
                        variant="quiet"
                        disabled={busy || group.studentIds.length === 1}
                        onClick={() =>
                          setMove({
                            studentId,
                            from: group.id,
                            to: "",
                          })
                        }
                      >
                        Pindahkan
                      </Button>
                    )}
                  </div>
                  {lesson.evidenceSnapshot.find(
                    (e) => e.studentId === studentId,
                  )?.status === "unknown" && (
                    <p className="text-sm text-muted-foreground">
                      {
                        evidenceReasonCopy[
                          lesson.evidenceSnapshot.find(
                            (e) => e.studentId === studentId,
                          )!.reason
                        ]
                      }
                    </p>
                  )}
                  {move?.studentId === studentId && (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!move.to) return;
                        commitMove(studentId, move.from, move.to);
                      }}
                    >
                      <label className="block max-w-md">
                        Pindahkan ke kelompok
                        <select
                          className={field}
                          value={move.to}
                          onChange={(e) =>
                            setMove({ ...move, to: e.target.value })
                          }
                        >
                          <option value="">Pilih kelompok</option>
                          {lesson.groups
                            .filter((other) => other.id !== group.id)
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <Button disabled={!move.to}>Simpan perubahan</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMove(undefined)}
                      >
                        Batal
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </Section>
  );
}
