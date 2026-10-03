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
import { field, panel } from "@/features/library/client";
import { createNameRepository } from "@/local/names";
import { Button } from "@/ui/components/button";
import { mathText } from "@/features/library/item-view";
import { PageHeader, StateNotice } from "@/ui/components/studio";
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
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dari jawaban ke langkah berikutnya"
        title="Asesmen & Hasil"
        description="Periksa jawaban siswa dan lihat hasilnya."
        actions={
          <Button asChild>
            <Link href="/guru/mulai?mode=assessment">Buat asesmen</Link>
          </Button>
        }
      />
      <div
        role="group"
        aria-label="Asesmen dan hasil"
        className="studio-tabs flex gap-2"
      >
        <Button
          aria-pressed={tab === "sessions"}
          variant={tab === "sessions" ? "default" : "outline"}
          onClick={() => setTab("sessions")}
        >
          Sesi Asesmen
        </Button>
        <Button
          aria-pressed={tab === "results"}
          variant={tab === "results" ? "default" : "outline"}
          onClick={() => setTab("results")}
        >
          Hasil
        </Button>
      </div>
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
      <ul className="studio-row-list">
        {runs.map((r) => (
          <li key={r.id}>
            <Link
              href={
                tab === "sessions"
                  ? `/guru/sesi/${r.id}`
                  : `/guru/hasil/${r.id}`
              }
              className="studio-row justify-between"
            >
              <span>
                <b>
                  {r.classLabel} · {r.document.title}
                </b>
                <small className="mt-1 block">
                  {r.date.split("-").reverse().join("/")} ·{" "}
                  {r.status === "active" ? "Sedang berlangsung" : "Selesai"}
                  {r.synthetic ? " · Data contoh" : ""}
                </small>
              </span>
              <span className="font-semibold text-primary">
                {tab === "sessions" ? "Lanjutkan" : "Buka hasil"} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!runs.length && (
        <StateNotice
          title={
            tab === "results"
              ? "Hasil akan muncul setelah asesmen"
              : "Belum ada asesmen berjalan"
          }
          action={
            <Button asChild variant="outline">
              <Link href="/guru/mulai?mode=assessment">
                Mulai cek pemahaman
              </Link>
            </Button>
          }
        >
          Pilih kelas dan Kartu Nalar untuk memeriksa pemahaman siswa. Jika
          memakai filter, coba pilihan kelas atau tanggal lain.
        </StateNotice>
      )}
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
  return (
    <div className="space-y-5">
      <Link
        href="/guru/asesmen"
        className="inline-flex min-h-12 items-center text-primary"
      >
        ← Asesmen & Hasil
      </Link>
      <PageHeader
        eyebrow="Catatan pemahaman kelas"
        title={`Hasil · Kelas ${run.classLabel}`}
        description={`${run.document.title} · ${run.date.split("-").reverse().join("/")}`}
      />
      <div className="studio-result-summary" aria-label="Ringkasan hasil">
        <div>
          <b>
            {responses.length}/{run.roster.length}
          </b>
          <span>Lembar masuk</span>
        </div>
        <div>
          <b>{responses.filter((r) => r.status === "review").length}</b>
          <span>Lembar perlu dicek</span>
        </div>
        <div>
          <b>{run.document.items.length}</b>
          <span>Soal · Versi {run.version}</span>
        </div>
      </div>
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
                              <li key={q.id}>
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
