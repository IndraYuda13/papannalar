"use client";
import { useState } from "react";
import type { LocalScope } from "../../local/scope";
import type { ClassDto } from "../../contracts/classes";
import type { SyncRecord } from "../../contracts/sync";
import {
  readSyncReviews,
  resolveSyncReview,
  restoreSyncClass,
  takeOverRestoredSession,
  type SyncReview,
} from "../session/sync-review";
import { Button } from "../../ui/components/button";
export function SyncReviewControls({
  scope,
  classroom,
}: {
  scope: LocalScope;
  classroom?: ClassDto;
}) {
  const [reviews, setReviews] = useState<SyncReview[]>([]),
    [records, setRecords] = useState<SyncRecord[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch {
      setMessage(
        "Versi berubah atau koneksi belum tersedia. Data lokal tetap disimpan; muat review kembali.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const value = await readSyncReviews(scope);
            setReviews(value);
            setMessage(
              value.length
                ? "Bandingkan jawaban sebelum memilih. Versi lokal sebelumnya tetap diarsipkan di perangkat."
                : "Tidak ada konflik yang menunggu review.",
            );
          })
        }
      >
        Tinjau konflik sinkronisasi
      </Button>
      {classroom && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              setRecords(await restoreSyncClass(scope, classroom));
              setMessage(
                "Sesi server dimuat. Nama lokal tidak dipulihkan dari server. Ambil alih untuk mengedit dari perangkat ini.",
              );
            })
          }
        >
          Muat sesi dari server
        </Button>
      )}
      {records.map((record) => (
        <div key={record.sessionId}>
          <p>
            Sesi {record.payload.cycle.ordinal} · versi {record.revision}
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              if (
                !classroom ||
                !window.confirm(
                  "Jadikan perangkat ini pengendali? Perangkat sebelumnya harus berhenti mengedit sesi ini.",
                )
              )
                return;
              void run(async () => {
                await takeOverRestoredSession(scope, classroom, record);
                setRecords([]);
                setMessage("Perangkat ini menjadi pengendali sesi.");
              });
            }}
          >
            Ambil alih sesi {record.payload.cycle.ordinal}
          </Button>
        </div>
      ))}
      {reviews.map((item) => (
        <div
          key={item.record.sessionId}
          className="space-y-2 rounded-input border p-3"
        >
          <h3 className="font-semibold">
            {item.classroom.label} · Sesi {item.record.payload.cycle.ordinal}
          </h3>
          {item.review.changes.map((change) => (
            <p
              key={`${change.assessmentId}/${change.studentId}`}
              className="text-sm"
            >
              Absen {change.attendanceNumber}: server{" "}
              {change.serverChoices?.join(" · ") ?? "belum ada"}; perangkat ini{" "}
              {change.localChoices.join(" · ")}.
            </p>
          ))}
          {!item.review.compatible && (
            <p>
              Sesi atau materi sudah berbeda. Gunakan versi server; jawaban
              lokal tetap dalam arsip.
            </p>
          )}
          {item.review.oralChanges.map((change) => (
            <p key={change.id} className="text-sm">
              Cek lisan absen {change.attendanceNumber}: server{" "}
              {change.serverAnswers?.join(" · ") ?? "belum ada"}; perangkat ini{" "}
              {change.localAnswers.join(" · ") || "belum dijawab"}
              {change.skipped ? " (dilewati)" : ""}.
            </p>
          ))}
          {item.review.turnChanges > 0 && (
            <p>
              {item.review.turnChanges} tugas bergiliran baru akan ditambahkan
              sekali.
            </p>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await resolveSyncReview(scope, item, "server");
                setReviews(reviews.filter((r) => r !== item));
                setMessage(
                  "Versi server dipertahankan. Versi lokal diarsipkan.",
                );
              })
            }
          >
            Pertahankan versi server
          </Button>
          <Button
            disabled={busy || !item.review.compatible}
            onClick={() => {
              if (
                !window.confirm(
                  "Ganti jawaban yang berbeda dengan pilihan perangkat ini dan ambil alih pengendali?",
                )
              )
                return;
              void run(async () => {
                await resolveSyncReview(scope, item, "local");
                setReviews(reviews.filter((r) => r !== item));
                setMessage(
                  "Pilihan tersimpan. Periksa status sinkronisasi; kelompok historis tetap beku.",
                );
              });
            }}
          >
            Gunakan jawaban lokal dan ambil alih
          </Button>
        </div>
      ))}
      <p role="status" className="text-sm">
        {message}
      </p>
    </div>
  );
}
