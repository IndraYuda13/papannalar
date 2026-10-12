"use client";
import { readLibraryDetail } from "@/features/library/read-detail";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import {
  runDetailSchema,
  type LibraryResponse,
  type LibraryRun,
} from "@/contracts/library";
// `panel` is still used by ResultPage (/guru/hasil/[id]), which is D2 scope.
import { field, panel } from "@/features/library/client";
import { createNameRepository } from "@/local/names";
import { Button } from "@/ui/components/button";
import { mathText } from "@/features/library/item-view";
import { PageHeader, Section, StateNotice } from "@/ui/components/studio";
import { FileCheck2 } from "lucide-react";

export function AssessmentsPage() {
  const { state, classes } = useTeacher(),
    [tab, setTab] = useState<"sessions" | "results">("sessions"),
    [cls, setClass] = useState(""),
    [collection, setCollection] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const runs = state.runs.filter(
    (r) =>
      r.mode === "assessment" &&
      (!cls || r.classId === cls) &&
      (!collection || r.collectionId === collection) &&
      (!from || r.date >= from) &&
      (!to || r.date <= to) &&
      (tab === "results" || r.status === "active"),
  );
  const filtered = Boolean(cls || collection || from || to);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hasil"
        description="Periksa jawaban siswa dan lihat hasilnya. Nama tidak ada di sini — hanya nomor absen."
        actions={
          <Button asChild>
            <Link href="/guru/mulai?mode=assessment">Buat asesmen</Link>
          </Button>
        }
      />
      <div
        role="group"
        aria-label="Asesmen dan hasil"
        className="studio-segmented"
      >
        <Button
          variant="quiet"
          aria-pressed={tab === "sessions"}
          onClick={() => setTab("sessions")}
        >
          Sesi Asesmen
        </Button>
        <Button
          variant="quiet"
          aria-pressed={tab === "results"}
          onClick={() => setTab("results")}
        >
          Hasil
        </Button>
      </div>
      <Section label="Cari asesmen">
        <details className="studio-filter-panel">
          <summary className="min-h-12 cursor-pointer content-center font-semibold text-primary">
            Cari berdasarkan kelas atau tanggal
            {cls || collection || from || to ? " · Filter aktif" : ""}
          </summary>
          <div className="studio-filter grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              Kumpulan
              <select
                className={field}
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              >
                <option value="">Semua kumpulan</option>
                {state.collections
                  .filter((c) => c.document.kind === "cards")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.document.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Dari tanggal
              <input
                type="date"
                className={field}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Sampai tanggal
              <input
                type="date"
                className={field}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setClass("");
              setCollection("");
              setFrom("");
              setTo("");
            }}
          >
            Tampilkan semua
          </Button>
        </details>
      </Section>
      <Section
        /* The sample flag is a per-list fact, so it is stated once here rather than repeated in
           every row (§8.7, F6). */
        label={
          (tab === "sessions" ? "Sesi asesmen" : "Hasil asesmen") +
          (runs.some((r) => r.synthetic) ? " · data contoh" : "")
        }
        ground="sheet"
      >
        {runs.length > 0 && (
          <ul className="studio-row-list">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={
                    tab === "sessions"
                      ? `/guru/sesi/${r.id}`
                      : `/guru/hasil/${r.id}`
                  }
                  className="studio-row"
                  title={`${r.classLabel} · ${r.document.title}`}
                >
                  <span className="studio-row-icon" aria-hidden>
                    <FileCheck2 size={22} strokeWidth={1.8} />
                  </span>
                  <span className="studio-row-content">
                    <h2>
                      {r.classLabel} · {r.document.title}
                    </h2>
                    <p>
                      {r.date.split("-").reverse().join("/")} ·{" "}
                      {r.status === "active" ? "Sedang berlangsung" : "Selesai"}
                    </p>
                  </span>
                  {/* The sample flag is a per-list fact, not per-row: repeating it in every row
                      stole the width the title needed and said the same thing N times. It is
                      stated once, in the section label (F6/§8.7). */}
                  <span className="studio-row-action" data-row-action>
                    {tab === "sessions" ? "Lanjutkan" : "Buka hasil"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!runs.length && (
          <StateNotice
            /* Three distinct empty states, because "no data yet" and "your filter matched nothing"
               are different facts and only one of them is the teacher's to fix (§6.5). */
            title={
              filtered
                ? "Belum ada yang cocok"
                : tab === "results"
                  ? "Belum ada hasil"
                  : "Belum ada sesi hari ini"
            }
            action={
              filtered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setClass("");
                    setCollection("");
                    setFrom("");
                    setTo("");
                  }}
                >
                  Tampilkan semua
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/guru/mulai?mode=assessment">Buat asesmen</Link>
                </Button>
              )
            }
          >
            {filtered
              ? "Coba kosongkan pencarian atau ubah tanggal."
              : tab === "results"
                ? "Hasil akan muncul setelah asesmen selesai diperiksa."
                : "Pilih kelas dan soal, lalu mulai cek pemahaman."}
          </StateNotice>
        )}
      </Section>
    </div>
  );
}
export function ResultPage({ id }: { id: string }) {
  const { scope } = useTeacher(),
    [detail, setDetail] = useState<{
      run: LibraryRun;
      responses: LibraryResponse[];
    }>(),
    [names, setNames] = useState<Record<string, string>>({}),
    [cached, setCached] = useState(false),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const loaded = await readLibraryDetail(scope, id);
      setDetail(loaded.detail);
      setCached(loaded.cached);
      setMessage(
        loaded.cached
          ? "Sambungan terganggu. Menampilkan jawaban yang tersimpan di perangkat ini."
          : "",
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
        "Hasil belum dapat dibuka. Sambungkan internet untuk memuatnya.",
      );
    }
  }, [id, scope]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    const synced = (event: Event) => {
      const value = runDetailSchema.safeParse(
        (event as CustomEvent<unknown>).detail,
      );
      if (value.success && value.data.run.id === id) setDetail(value.data);
    };
    window.addEventListener("pn-library-synced", synced);
    return () => window.removeEventListener("pn-library-synced", synced);
  }, [id]);
  if (!detail)
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
  const { run, responses } = detail,
    student = run.roster.find((s) => s.id === selected),
    answer = responses.find((r) => r.studentId === selected);
  // F5/V8: one hero metric, then supporting detail. The old block was three equal-weight
  // tiles, so the decisive comprehension signal competed with two intake counters.
  const graded = responses.filter((r) => r.status === "received");
  const misses = run.document.items
    .map((q, index) => ({
      question: q,
      index,
      missed:
        q.kind === "card"
          ? graded.filter((r) => r.answers[index] !== q.key).length
          : 0,
    }))
    .filter((entry) => entry.question.kind === "card")
    .sort((a, b) => b.missed - a.missed);
  const hardest = graded.length ? misses[0] : undefined;
  return (
    <div className="space-y-5">
      <Link
        href="/guru/asesmen"
        className="inline-flex min-h-12 items-center text-primary"
      >
        ← Asesmen & Hasil
      </Link>
      {/* Friction 9 / A14: the results sheet is the teacher's own paper summary, so it gets a
          primary action of its own. `Bahas bersama` is that action; the print path is its
          secondary. Names never reach paper — attendance numbers only. */}
      <div className="studio-print-actions" data-print-skip>
        <Button variant="outline" onClick={() => window.print()}>
          Cetak ringkasan
        </Button>
        <span className="studio-print-note">
          Cetak ukuran asli 100%. Hanya nomor absen yang tercetak.
        </span>
      </div>
      <PageHeader
        title={`Hasil · Kelas ${run.classLabel}`}
        description={`${run.document.title} · ${run.date.split("-").reverse().join("/")}`}
      />
      <p className="studio-print-head">
        PapanNalar · {run.classLabel} ·{" "}
        {run.date.split("-").reverse().join("/")}
      </p>
      {hardest && (
        <Section label="Soal yang paling sering salah">
          <p className="studio-comprehension-question">
            {mathText(hardest.question.prompt)}
          </p>
          <p className="studio-comprehension-miss">
            {hardest.missed} dari {graded.length} lembar diperiksa menjawab
            belum tepat
          </p>
        </Section>
      )}
      <p className="studio-intake-line">
        {responses.length}/{run.roster.length} lembar masuk ·{" "}
        {responses.filter((r) => r.status === "review").length} perlu dicek ·{" "}
        {run.document.items.length} soal · Versi {run.version}
      </p>
      {responses.some((r) => r.status === "received") && (
        <details className={panel}>
          <summary className="min-h-12 cursor-pointer content-center font-bold">
            Soal untuk dibahas bersama
          </summary>
          <p className="text-sm">
            Hitungan dari lembar yang sudah diperiksa. Pilih soal yang perlu
            dijelaskan kembali kepada kelas.
          </p>
          <ol className="space-y-3">
            {run.document.items.map((q, index) =>
              q.kind === "card" ? (
                <li key={q.id}>
                  <b>
                    Soal {index + 1}: {mathText(q.prompt)}
                  </b>
                  <p>
                    {
                      responses.filter(
                        (r) =>
                          r.status === "received" && r.answers[index] !== q.key,
                      ).length
                    }{" "}
                    jawaban belum tepat dari{" "}
                    {responses.filter((r) => r.status === "received").length}{" "}
                    lembar diperiksa.
                  </p>
                  {q.explanation && (
                    <p className="text-muted-foreground">{q.explanation}</p>
                  )}
                </li>
              ) : null,
            )}
          </ol>
        </details>
      )}
      {run.synthetic && (
        <p className="text-sm">Hasil contoh, bukan data siswa nyata.</p>
      )}
      <div className="practice-next-action">
        <p>
          {responses.length < run.roster.length
            ? "Masih ada siswa yang belum mengumpulkan jawaban. Anda bisa melengkapinya sekarang atau nanti."
            : "Semua lembar sudah masuk. Pilih nomor absen untuk melihat jawaban siswa."}
        </p>
        <Button asChild variant="outline">
          <Link href={`/guru/sesi/${id}`}>Pindai atau koreksi lembar</Link>
        </Button>
      </div>
      <section className={panel}>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <FileCheck2 size={24} className="text-primary" aria-hidden />
          {responses.length}/{run.roster.length} lembar masuk
        </h2>
        <p className="text-sm text-muted-foreground">
          {cached ? "Salinan tersimpan di perangkat" : "Hasil tersimpan"} ·
          Nomor absen saat asesmen
        </p>
        <ul className="divide-y">
          {run.roster.map((s) => {
            const r = responses.find((a) => a.studentId === s.id);
            return (
              <li key={s.id}>
                <button
                  className="flex min-h-16 w-full items-center justify-between gap-2 text-left"
                  aria-expanded={selected === s.id}
                  onClick={() => setSelected(selected === s.id ? "" : s.id)}
                >
                  <span>
                    <b className="mr-2">
                      {String(s.attendanceNumber).padStart(2, "0")}
                    </b>
                    {names[s.id] ?? `Absen ${s.attendanceNumber}`}
                  </span>
                  <span className="text-right text-sm">
                    {r
                      ? `${r.status === "review" ? "Perlu dicek" : "Sudah masuk"} · ${r.correct}/${run.document.items.length}`
                      : "Belum masuk"}
                  </span>
                </button>
                {selected === s.id && student && (
                  <section className={panel} aria-label="Rincian jawaban">
                    <h2 className="text-xl font-bold">
                      Absen {student.attendanceNumber} · Rincian jawaban
                    </h2>
                    {answer ? (
                      <>
                        <p>
                          Revisi {answer.revision} · {answer.correct}/
                          {run.document.items.length} benar
                        </p>
                        <ol className="space-y-4">
                          {run.document.items.map((q, i) =>
                            q.kind === "card" ? (
                              <li
                                key={q.id}
                                /* T2-03: three distinct visual states, and a blank row is never
                                   presented as `Belum tahu`. The stored schema only carries a
                                   consumed answer or `?`, so `kosong` is reserved for the row
                                   the scanner rejected; a response flagged for review is the
                                   unreadable/double-marked case and says so. */
                                data-scan-state={
                                  answer.status === "review"
                                    ? "perlu-dicek"
                                    : "terbaca"
                                }
                              >
                                <b>
                                  {i + 1}. {mathText(q.prompt)}
                                </b>
                                <p>
                                  Jawaban:{" "}
                                  {answer.answers[i] === "?"
                                    ? "? / Belum tahu"
                                    : answer.answers[i]}{" "}
                                  · Kunci: {q.key}
                                </p>
                                {q.explanation && (
                                  <p className="text-muted-foreground">
                                    {q.explanation}
                                  </p>
                                )}
                              </li>
                            ) : null,
                          )}
                        </ol>
                      </>
                    ) : (
                      <p>Belum ada lembar untuk siswa ini.</p>
                    )}
                  </section>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <p role="status">{message}</p>
    </div>
  );
}
