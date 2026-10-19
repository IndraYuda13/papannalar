"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import { readLearningResult, readResultsIndex } from "@/local/learning-client";
import type { ResultDetail, ResultIndexEntry } from "@/contracts/results-index";
import type { RunDetail } from "@/contracts/library";
import { createNameRepository } from "@/local/names";
import { field } from "@/features/library/client";
import { pendingCardResponses } from "@/features/library/pending-card-responses";
import { mathText } from "@/features/library/item-view";
import { Button } from "@/ui/components/button";
import { PageHeader, Section, StateNotice } from "@/ui/components/studio";

const templateLabel = {
  activity: "Ringkasan kegiatan",
  cards: "Jawaban kartu",
  groups: "Kegiatan kelompok",
  diagnostic: "Hasil diagnostik",
};
export function AssessmentsPage() {
  const { classes, scope } = useTeacher();
  const [entries, setEntries] = useState<ResultIndexEntry[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [cls, setClass] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const load = useCallback(
    async (next?: string) => {
      setBusy(true);
      setFailed(false);
      setMessage("");
      try {
        const result = await readResultsIndex(scope, {
          ...(cls ? { classId: cls } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(next ? { cursor: next } : {}),
        });
        setEntries((old) =>
          next
            ? [
                ...old,
                ...result.entries.filter(
                  (e) => !old.some((o) => o.key === e.key),
                ),
              ]
            : result.entries,
        );
        setCursor(result.nextCursor);
        if (result.cached)
          setMessage(
            "Sambungan terputus. Menampilkan data terakhir yang tersimpan.",
          );
      } catch {
        setFailed(true);
        setMessage(
          "Hasil belum dapat dimuat. Periksa sambungan lalu coba lagi.",
        );
      } finally {
        setBusy(false);
      }
    },
    [scope, cls, from, to],
  );
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hasil"
        description="Lihat ringkasan kegiatan dan hasil jawaban kartu."
        actions={
          <Button asChild variant="outline">
            <Link href="/guru/mulai?mode=assessment">Buat asesmen</Link>
          </Button>
        }
      />
      <Section label="Cari kegiatan">
        <details>
          <summary className="min-h-12 cursor-pointer content-center font-semibold">
            Cari berdasarkan kelas atau tanggal
          </summary>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Kelas
              <select
                className={field}
                value={cls}
                onChange={(e) => setClass(e.target.value)}
              >
                <option value="">Semua kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dari tanggal
              <input
                className={field}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Sampai tanggal
              <input
                className={field}
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <Button
            variant="quiet"
            onClick={() => {
              setClass("");
              setFrom("");
              setTo("");
            }}
          >
            Tampilkan semua
          </Button>
        </details>
      </Section>
      <Section label="Kegiatan dan hasil" ground="sheet">
        {busy && !entries.length ? (
          <StateNotice kind="loading" title="Memuat hasil…" />
        ) : failed && !entries.length ? (
          <StateNotice
            kind="error"
            title={message}
            action={<Button onClick={() => void load()}>Coba lagi</Button>}
          />
        ) : !entries.length ? (
          <StateNotice
            title={
              cls || from || to ? "Belum ada yang cocok" : "Belum ada hasil"
            }
          >
            Ringkasan muncul setelah kegiatan tersimpan. Ubah pencarian atau
            mulai mengajar.
          </StateNotice>
        ) : (
          <ul className="studio-row-list">
            {entries.map((e) => (
              <li key={e.key}>
                <Link
                  className="studio-row"
                  href={`/guru/hasil/${e.id}?source=${e.source}`}
                >
                  <span className="studio-row-content">
                    <h2>
                      {e.classLabel} · {e.title}
                    </h2>
                    <p>
                      {templateLabel[e.template]} ·{" "}
                      {e.date.split("-").reverse().join("/")} ·{" "}
                      {e.status === "active" ? "Berlangsung" : "Selesai"}
                      {e.synthetic ? " · Data contoh" : ""}
                    </p>
                  </span>
                  <span className="studio-row-action">Buka hasil</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {cursor && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void load(cursor)}
          >
            Muat kegiatan berikutnya
          </Button>
        )}
      </Section>
      <p role="status">{message}</p>
      {failed && entries.length > 0 && (
        <Button variant="outline" onClick={() => void load()}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
export function ResultPage({
  id,
  source = "library",
}: {
  id: string;
  source?: ResultDetail["source"];
}) {
  const { scope } = useTeacher(),
    [result, setResult] = useState<ResultDetail>(),
    [names, setNames] = useState<Record<string, string>>({}),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setMessage("");
    try {
      setResult(await readLearningResult(scope, { source, id }));
      if (!navigator.onLine)
        setMessage(
          "Sambungan terputus. Menampilkan data terakhir yang tersimpan.",
        );
      const repo = createNameRepository(scope);
      try {
        setNames(
          Object.fromEntries(
            (await repo.readAll()).map((n) => [n.studentId, n.displayName]),
          ),
        );
      } finally {
        repo.close();
      }
    } catch {
      setMessage(
        "Hasil belum dapat dibuka. Sambungkan internet lalu coba lagi.",
      );
    }
  }, [scope, id, source]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (!result)
    return (
      <StateNotice
        kind={message ? "error" : "loading"}
        title={message || "Memuat hasil…"}
        action={
          message ? (
            <Button onClick={() => void load()}>Coba lagi</Button>
          ) : undefined
        }
      />
    );
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-12 items-center text-primary"
        href="/guru/asesmen"
      >
        Kembali ke Hasil
      </Link>
      {result.source === "library" ? (
        <LibraryResult detail={result.detail} names={names} />
      ) : result.source === "group_lesson" ? (
        <>
          <PageHeader
            title={`Hasil · ${result.lesson.classLabel}`}
            description={`Kegiatan kelompok · ${result.lesson.date} · ${result.lesson.status === "closed" ? "Selesai" : "Berlangsung"}`}
          />
          <Section label="Ringkasan kegiatan" className="pn-group-result">
            <p>
              Jawaban bersama di layar bukan nilai tiap siswa. Kelompok
              tersimpan sesuai saat kegiatan dimulai.
            </p>
            <ul className="studio-row-list">
              {result.lesson.groups.map((g) => {
                const a = result.lesson.assignments.find(
                    (a) => a.groupId === g.id,
                  ),
                  run = result.runs.find((r) => r.run.id === a?.runId);
                return (
                  <li key={g.id} className="py-4">
                    <h2 className="font-bold">
                      {g.label} · {g.studentIds.length} siswa
                    </h2>
                    <p>
                      {a
                        ? {
                            teacher: "Dibimbing guru",
                            board: "Menjawab di layar",
                            cards: "Mengerjakan soal dengan kartu",
                          }[a.method]
                        : "Belum ditetapkan"}{" "}
                      · {run?.run.document.title} ·{" "}
                      {a?.status === "completed"
                        ? "Tugas selesai"
                        : a?.status === "stopped"
                          ? "Dihentikan"
                          : a?.status === "active"
                            ? "Berlangsung"
                            : "Disiapkan"}
                    </p>
                    <details>
                      <summary className="min-h-12 cursor-pointer content-center">
                        Lihat anggota
                      </summary>
                      <ul>
                        {g.studentIds.map((id) => {
                          const s = result.lesson.presence.find(
                            (s) => s.id === id,
                          );
                          return (
                            <li key={id}>
                              {s?.attendanceNumber}.{" "}
                              <span data-print-skip>
                                {names[id] ?? `Siswa ${s?.attendanceNumber}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
            <Button asChild variant="outline">
              <Link
                href={`/guru/latihan?lesson=${result.lesson.id}&class=${result.lesson.classId}`}
              >
                {result.lesson.status === "closed"
                  ? "Buka kegiatan tersimpan"
                  : "Lanjutkan kegiatan"}
              </Link>
            </Button>
          </Section>
          {result.runs
            .filter((r) => r.run.responseMethod === "cards")
            .map((r) => (
              <LibraryResult key={r.run.id} detail={r} names={names} embedded />
            ))}
          <p>
            Jawaban kartu yang belum masuk dapat dilengkapi nanti. Kartu
            terlambat tidak mengaktifkan layar lagi.
          </p>
        </>
      ) : (
        <>
          <PageHeader
            title="Hasil diagnostik"
            description="Riwayat asesmen tersimpan"
          />
          <Section label="Jawaban individual">
            <p>
              {result.detail.roster.length} siswa · {result.detail.cards.length}{" "}
              kartu tersimpan
            </p>
            <ul className="studio-row-list">
              {result.detail.cards.map((c) => (
                <li className="py-3" key={`${c.sessionId}:${c.studentId}`}>
                  <p>
                    Absen{" "}
                    {
                      result.detail.roster.find((s) => s.id === c.studentId)
                        ?.attendanceNumber
                    }{" "}
                    · Revisi {c.revision}
                  </p>
                  <p>{c.choices.join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
function LibraryResult({
  detail,
  names,
  embedded = false,
}: {
  detail: RunDetail;
  names: Record<string, string>;
  embedded?: boolean;
}) {
  const { run, responses } = detail;
  const { scope } = useTeacher();
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void pendingCardResponses(scope, run.id)
      .then((rows) => {
        if (!cancelled) setPendingCount(rows.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scope, run.id]);
  const [selected, setSelected] = useState("");
  const missing =
    run.roster.length - responses.filter((r) => r.status === "received").length;
  return (
    <>
      {!embedded && (
        <PageHeader
          title={`Hasil · ${run.classLabel}`}
          description={`${run.document.title} · ${run.date} · Versi ${run.version}`}
        />
      )}
      <Section
        className="pn-library-result"
        ground="inset"
        label={
          run.responseMethod === "none"
            ? "Ringkasan kegiatan"
            : `Jawaban kartu · ${run.document.title}`
        }
      >
        <p>
          {run.document.items.length} soal · Versi {run.version} ·{" "}
          {run.status === "closed"
            ? "Kegiatan selesai"
            : "Kegiatan berlangsung"}
        </p>
        {run.responseMethod === "none" ? (
          <>
            <p>
              Bahas soal tanpa pengumpulan kartu. Tidak ada nilai individual
              dari kegiatan ini.
            </p>
            <ol className="space-y-3 py-3">
              {run.document.items.map((q, i) => (
                <li key={q.id}>
                  {i + 1}. {mathText(q.prompt)}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            {pendingCount > 0 && (
              <p role="status">
                {pendingCount} jawaban menunggu pengiriman dari perangkat ini,
                belum menjadi hasil tersimpan.
              </p>
            )}
            <p>
              {responses.filter((r) => r.status === "received").length}/
              {run.roster.length} kartu diperiksa ·{" "}
              {responses.filter((r) => r.status === "review").length} perlu
              dicek
            </p>
            {missing > 0 && (
              <p>
                {missing} kartu belum diperiksa. Jawaban masih bisa dilengkapi.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Hasil {run.document.items.length} soal pada kumpulan ini, bukan
              tingkat kemampuan. Hanya jawaban diterima yang menjadi hasil
              individual.
            </p>
            <ul className="studio-row-list">
              {run.roster.map((s) => {
                const r = responses.find((r) => r.studentId === s.id);
                return (
                  <li key={s.id}>
                    <button
                      className="flex min-h-16 w-full items-center justify-between gap-3 text-left"
                      aria-expanded={selected === s.id}
                      onClick={() => setSelected(selected === s.id ? "" : s.id)}
                    >
                      <span className="min-w-0 break-words">
                        <b>{s.attendanceNumber}.</b>{" "}
                        <span data-print-skip>
                          {names[s.id] ?? `Siswa ${s.attendanceNumber}`}
                        </span>
                      </span>
                      <span>
                        {!r
                          ? "Belum masuk"
                          : r.status === "review"
                            ? "Perlu dicek"
                            : `${r.correct}/${run.document.items.length} benar`}
                      </span>
                    </button>
                    {selected === s.id && (
                      <div className="space-y-3 pb-4">
                        {r ? (
                          <>
                            <p>
                              Revisi {r.revision} ·{" "}
                              {r.status === "review"
                                ? "Belum menjadi hasil valid"
                                : "Jawaban diterima"}
                            </p>
                            <ol className="space-y-3">
                              {run.document.items.map((q, i) => (
                                <li key={q.id}>
                                  <p>
                                    {i + 1}. {mathText(q.prompt)}
                                  </p>
                                  <p>
                                    Jawaban:{" "}
                                    {r.answerStates[i] === "blank"
                                      ? "Kosong"
                                      : r.answerStates[i] === "unreadable"
                                        ? "Tidak terbaca"
                                        : r.answers[i] === "?"
                                          ? "? / Belum tahu"
                                          : r.answers[i]}
                                  </p>
                                </li>
                              ))}
                            </ol>
                          </>
                        ) : (
                          <p>Belum ada kartu untuk siswa ini.</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Button asChild variant="outline">
              <Link href={`/guru/sesi/${run.id}`}>
                Pindai atau koreksi lembar
              </Link>
            </Button>
          </>
        )}
      </Section>
    </>
  );
}
