"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GroupLesson } from "@/contracts/group-lesson";
import { groupLessonCall } from "@/local/learning-client";
import { useTeacher } from "./app-context";
import { Button } from "@/ui/components/button";

export function GroupDrafts() {
  const { classes, offline } = useTeacher();
  const [lessons, setLessons] = useState<GroupLesson[]>([]),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await groupLessonCall({ action: "list" });
      // Semua kelas: guru sering lupa di kelas mana draft disimpan.
      setLessons(result.lessons.filter((l) => l.status !== "closed"));
      setMessage("");
    } catch {
      setMessage(
        "Persiapan tersimpan belum dapat dimuat. Coba lagi sebelum membuat kegiatan baru.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <>
      {lessons.length > 0 && (
        <details>
          <summary className="min-h-12 cursor-pointer content-center font-semibold">
            Lanjutkan persiapan atau kegiatan tersimpan
          </summary>
          <p className="text-sm">
            Kegiatan kelas Anda yang belum ditutup. Pilih Lanjutkan untuk
            membukanya di kelas asal kegiatan.
          </p>
          <ul className="studio-row-list">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  className="studio-row"
                  href={`/guru/latihan?class=${l.classId}&lesson=${l.id}`}
                >
                  <span className="studio-row-content">
                    <h2>
                      {classes.find((c) => c.id === l.classId)?.label ??
                        "Kelas"}{" "}
                      · {l.date} · {l.groups.length} kelompok
                    </h2>
                    <p>
                      {l.status === "draft"
                        ? "Persiapan tersimpan"
                        : "Kegiatan berlangsung"}
                    </p>
                  </span>
                  <span className="studio-row-action">Lanjutkan</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      {message && (
        <>
          <p role="status">{message}</p>
          <Button
            variant="outline"
            disabled={offline}
            onClick={() => void load()}
          >
            Muat persiapan tersimpan
          </Button>
        </>
      )}
    </>
  );
}
