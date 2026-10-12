import type { GroupLesson } from "@/contracts/group-lesson";
export function GroupEvidenceSummary({
  lesson,
  groupCount,
}: {
  lesson: GroupLesson;
  groupCount: number;
}) {
  const unknown = lesson.evidenceSnapshot.filter(
    (e) => e.status === "unknown",
  ).length;
  return (
    <>
      <p>
        {lesson.presence.length} siswa dalam {groupCount} kelompok
      </p>
      {unknown > 0 && (
        <p>
          {unknown} siswa belum memiliki hasil yang sesuai. Mereka tetap masuk
          kelompok dan dapat dipindahkan.
        </p>
      )}
      {unknown === lesson.presence.length && (
        <p>
          Belum ada hasil untuk topik ini. Pembagian ini sementara, bukan
          tingkat kemampuan.
        </p>
      )}
      <details>
        <summary className="min-h-12 cursor-pointer content-center">
          Hasil yang dipakai
        </summary>
        <ul className="space-y-3">
          {lesson.evidenceSnapshot.map((e) => (
            <li key={e.studentId}>
              Absen{" "}
              {
                lesson.presence.find((s) => s.id === e.studentId)
                  ?.attendanceNumber
              }
              :{" "}
              {e.evidence
                ? `${e.evidence.correct}/${e.evidence.total} soal · Versi ${e.evidence.version} · ${e.evidence.assessedAt} · Kumpulan ${e.evidence.collectionId.slice(0, 8)}`
                : "Belum ada hasil untuk topik ini"}
            </li>
          ))}
        </ul>
        <p>
          Hasil pada kumpulan ini, bukan tingkat kemampuan. Hasil baru hanya
          memengaruhi saran kegiatan berikutnya.
        </p>
      </details>
    </>
  );
}
