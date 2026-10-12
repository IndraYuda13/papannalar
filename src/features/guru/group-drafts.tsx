"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GroupLesson } from "@/contracts/group-lesson";
import { groupLessonCall } from "@/local/learning-client";
import { useTeacher } from "./app-context";
import { Button } from "@/ui/components/button";
export function GroupDrafts({ classId }: { classId: string }) {
  const { offline } = useTeacher();
  const [lessons, setLessons] = useState<GroupLesson[]>([]),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await groupLessonCall({ action: "list" });
      setLessons(
        result.lessons.filter(
          (l) => l.classId === classId && l.status !== "closed",
        ),
      );
      setMessage("");
    } catch {
      setMessage(
        "Persiapan tersimpan belum dapat dimuat. Coba lagi sebelum membuat kegiatan baru.",
      );
    }
  }, [classId]);
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
          <ul className="studio-row-list">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  className="studio-row"
                  href={`/guru/latihan?class=${classId}&lesson=${l.id}`}
                >
                  <span className="studio-row-content">
                    <h2>
                      {l.date} · {l.groups.length} kelompok
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
