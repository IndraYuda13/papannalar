"use client";
import { useCallback, useEffect, useState } from "react";
import {
  runDetailSchema,
  type LibraryResponse,
  type LibraryRun,
} from "@/contracts/library";
import {
  libraryCache,
  libraryResponseConflicts,
  resolveLibraryResponse,
  syncLibraryResponses,
  withPendingLibraryResponses,
} from "@/local/library";
import type { LocalScope } from "@/local/scope";
import { Button } from "@/ui/components/button";
import { libraryCall } from "./client";

export function ConflictReview({
  scope,
  run,
  canMutate,
}: {
  scope: LocalScope;
  run: LibraryRun;
  canMutate: boolean;
}) {
  const id = run.id;
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof libraryResponseConflicts>>
  >([]);
  const [remote, setRemote] = useState<LibraryResponse[]>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const conflicts = (await libraryResponseConflicts(scope)).filter(
        (r) => r.id === id,
      );
      setRows(conflicts);
      if (conflicts.length)
        setRemote(
          runDetailSchema.parse(await libraryCall({ action: "detail", id }))
            .responses,
        );
    } catch {
      setMessage(
        "Sambungkan internet untuk membandingkan kedua jawaban. Jawaban di perangkat tetap tersimpan.",
      );
    }
  }, [id, scope]);
  useEffect(() => {
    const refresh = () => void load();
    const timer = setTimeout(refresh, 0);
    window.addEventListener("pn-library-conflict", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pn-library-conflict", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [load]);
  if (!rows.length) return null;
  return (
    <section
      aria-label="Bandingkan jawaban"
      className="practice-feedback space-y-3"
    >
      <h2 className="font-bold">
        {rows.length} jawaban berbeda di dua perangkat
      </h2>
      <p>
        Pilih jawaban yang ingin disimpan. Jawaban siswa lain tetap dikirim.
      </p>
      {rows.map((row) => {
        const saved = remote?.find((r) => r.studentId === row.studentId);
        const student = run.roster.find((s) => s.id === row.studentId);
        return (
          <div
            key={row.studentId}
            className="space-y-2 rounded-input border bg-white p-3"
          >
            <h3 className="font-bold">
              {student
                ? `Absen ${student.attendanceNumber}`
                : "Nomor absen belum ditemukan"}
            </h3>
            <p>Di perangkat ini: {row.answers.join(" · ")}</p>
            <p className="text-sm">
              {row.status === "review"
                ? "Masih perlu diperiksa"
                : "Sudah diperiksa"}
            </p>
            <p>
              Sudah tersimpan:{" "}
              {remote
                ? (saved?.answers.join(" · ") ?? "Belum ada jawaban")
                : "Memuat jawaban…"}
            </p>
            {saved && (
              <p className="text-sm">
                {saved.status === "review"
                  ? "Masih perlu diperiksa"
                  : "Sudah diperiksa"}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {(["local", "server"] as const).map((choice) => (
                <Button
                  key={choice}
                  disabled={busy || !canMutate || !remote || !student}
                  variant="outline"
                  onClick={async () => {
                    setBusy(true);
                    setMessage("");
                    try {
                      await resolveLibraryResponse(scope, row, saved, choice);
                      if (choice === "local")
                        await syncLibraryResponses(scope, libraryCall);
                      const detail = await withPendingLibraryResponses(
                        scope,
                        runDetailSchema.parse(
                          await libraryCall({ action: "detail", id }),
                        ),
                      );
                      await libraryCache(scope, "detail", id, detail);
                      window.dispatchEvent(
                        new CustomEvent("pn-library-synced", { detail }),
                      );
                      await load();
                    } catch {
                      setMessage(
                        "Jawaban berubah lagi atau sambungan terputus. Pilih Muat ulang perbandingan sebelum mencoba lagi.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {choice === "local"
                    ? "Gunakan jawaban perangkat ini"
                    : "Gunakan jawaban yang sudah tersimpan"}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
      <Button variant="outline" disabled={busy} onClick={() => void load()}>
        Muat ulang perbandingan
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
