"use client";
import { useState, type FormEvent } from "react";
import type { StudentDto } from "@/contracts/api";
import { createNameRepository } from "@/local/names";
import { parseLocalRosterCsv, exportLocalRosterCsv } from "./local-csv";
import { Button } from "@/ui/components/button";
export function LocalRoster({
  ownerId,
  mode,
  students,
  onSaved,
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  students: readonly StudentDto[];
  onSaved: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    const id = String(data.get("studentId")),
      displayName = String(data.get("displayName") ?? "");
    const repo = createNameRepository({ ownerId, mode });
    try {
      if (!students.some((s) => s.id === id)) throw new Error();
      await repo.save(id, displayName);
      form.reset();
      await onSaved();
      setMessage("Nama lokal disimpan. Kosongkan isian untuk menghapusnya.");
    } catch {
      setMessage("Nama belum tersimpan. Periksa penyimpanan lokal.");
    } finally {
      repo.close();
    }
  }
  async function importCsv(file?: File) {
    if (!file) return;
    const repo = createNameRepository({ ownerId, mode });
    try {
      if (file.size > 100_000) throw new Error();
      const records = parseLocalRosterCsv(await file.text(), students);
      await repo.saveMany(records);
      await onSaved();
      setMessage(
        `${records.length} nama diproses lokal. Tidak ada CSV atau nama yang diunggah.`,
      );
    } catch {
      setMessage(
        "CSV tidak diimpor. Gunakan header absen,nama; periksa nomor ganda/tidak dikenal dan panjang isian.",
      );
    } finally {
      repo.close();
    }
  }
  async function exportCsv() {
    const repo = createNameRepository({ ownerId, mode });
    try {
      const names = Object.fromEntries(
        (await repo.readAll()).map((n) => [n.studentId, n.displayName]),
      );
      const blob = new Blob([exportLocalRosterCsv(students, names)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "nama-lokal.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "CSV diunduh dari perangkat ini. Simpan hanya pada perangkat guru.",
      );
    } catch {
      setMessage(
        "CSV belum dapat diunduh. Buka penyimpanan nama lokal terlebih dahulu.",
      );
    } finally {
      repo.close();
    }
  }
  return (
    <details>
      <summary className="min-h-12 cursor-pointer font-semibold">
        Nama opsional · hanya perangkat ini
      </summary>
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          Absen untuk nama lokal
          <select
            name="studentId"
            className="min-h-12 w-full border bg-white px-3"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                Absen {s.attendanceNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Nama atau panggilan lokal
          <input
            name="displayName"
            autoComplete="off"
            maxLength={120}
            className="min-h-12 w-full border px-3"
          />
        </label>
        <Button type="submit" variant="outline">
          Simpan nama lokal
        </Button>
      </form>
      <label className="mt-3 block">
        Impor CSV lokal (absen,nama)
        <input
          type="file"
          accept=".csv,text/csv"
          className="block min-h-12 w-full"
          onChange={(e) => {
            void importCsv(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <Button type="button" variant="outline" onClick={() => void exportCsv()}>
        Ekspor CSV lokal
      </Button>
      <p role="status">{message}</p>
    </details>
  );
}
