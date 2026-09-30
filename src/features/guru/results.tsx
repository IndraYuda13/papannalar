"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import {
  runDetailSchema,
  type LibraryResponse,
  type LibraryRun,
} from "@/contracts/library";
import { libraryCall, field, panel } from "@/features/library/client";
import { libraryCache } from "@/local/library";
import { createNameRepository } from "@/local/names";
import { Button } from "@/ui/components/button";
import { mathText } from "@/features/library/item-view";
import { ClipboardCheck, FileCheck2 } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-[28px] font-extrabold">
          <ClipboardCheck size={28} className="text-primary" aria-hidden />
          Asesmen & Hasil
        </h1>
        <Button asChild>
          <Link href="/guru/mulai?mode=assessment">Buat asesmen</Link>
        </Button>
      </div>
      <p>Periksa jawaban siswa dan lihat hasilnya.</p>
      <div role="tablist" className="flex gap-2">
        <Button
          role="tab"
          aria-selected={tab === "sessions"}
          variant={tab === "sessions" ? "default" : "outline"}
          onClick={() => setTab("sessions")}
        >
          Sesi Asesmen
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "results"}
          variant={tab === "results" ? "default" : "outline"}
          onClick={() => setTab("results")}
        >
          Hasil
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      <ul className="space-y-3">
        {runs.map((r) => (
          <li key={r.id}>
            <Link
              href={
                tab === "sessions"
                  ? `/guru/sesi/${r.id}`
                  : `/guru/hasil/${r.id}`
              }
              className={`${panel} flex flex-wrap items-center justify-between gap-3`}
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
      {!runs.length && <p>Belum ada asesmen pada pilihan ini.</p>}
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
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const data = navigator.onLine
        ? runDetailSchema.parse(await libraryCall({ action: "detail", id }))
        : await libraryCache(scope, "detail", id);
      if (!data) throw new Error();
      setDetail(data);
      if (navigator.onLine) await libraryCache(scope, "detail", id, data);
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
  if (!detail) return <p role="status">{message || "Memuat hasil…"}</p>;
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
      <h1 className="text-[28px] font-extrabold">
        Hasil · Kelas {run.classLabel}
      </h1>
      <p>
        {run.document.title} · {run.date.split("-").reverse().join("/")}
      </p>
      {run.synthetic && (
        <p className="text-sm">Hasil contoh, bukan data siswa nyata.</p>
      )}
      <section className={panel}>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <FileCheck2 size={24} className="text-primary" aria-hidden />
          {responses.length}/{run.roster.length} lembar masuk
        </h2>
        <p className="text-sm text-muted-foreground">
          {navigator.onLine
            ? "Hasil tersimpan"
            : "Salinan tersimpan di perangkat"}{" "}
          · Nomor absen saat asesmen
        </p>
        <ul className="divide-y">
          {run.roster.map((s) => {
            const r = responses.find((a) => a.studentId === s.id);
            return (
              <li key={s.id}>
                <button
                  className="flex min-h-16 w-full items-center justify-between gap-2 text-left"
                  onClick={() => setSelected(s.id)}
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
              </li>
            );
          })}
        </ul>
      </section>
      {student && (
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
                        <p className="text-muted-foreground">{q.explanation}</p>
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
      <Button asChild variant="outline">
        <Link href={`/guru/sesi/${id}`}>Pindai atau koreksi lembar</Link>
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
