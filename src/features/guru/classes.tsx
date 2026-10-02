"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "./app-context";
import {
  classDetailSchema,
  serializeCreateClass,
  serializeUpdateClass,
  type ClassDto,
} from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import { Button } from "@/ui/components/button";
import {
  field,
  panel,
  libraryCall,
  jakartaDate,
} from "@/features/library/client";
import { createNameRepository } from "@/local/names";
import { libraryCache } from "@/local/library";
import { LocalRoster } from "./local-roster";
import { classPresence } from "@/local/class-presence";
import { UsersRound } from "lucide-react";
export function ClassesPage() {
  const { classes, scope, refresh } = useTeacher(),
    [adding, setAdding] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-[28px] font-extrabold">
          <UsersRound size={28} className="text-primary" aria-hidden />
          Kelas
        </h1>
        <Button onClick={() => setAdding(!adding)}>Tambah kelas</Button>
      </div>
      {adding && (
        <form
          className={panel}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              const res = await fetch("/api/v1/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: serializeCreateClass({
                  id: crypto.randomUUID(),
                  label: String(f.get("label")),
                  grade: Number(f.get("grade")),
                  count: Number(f.get("count")),
                  mode: scope.mode,
                }),
              });
              if (!res.ok) throw new Error();
              await refresh();
              setAdding(false);
            } catch {
              setMessage("Kelas belum tersimpan. Periksa isian dan sambungan.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nama rombel
            <input
              className={field}
              name="label"
              placeholder="7B"
              maxLength={40}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Tingkat
              <input
                name="grade"
                type="number"
                min={1}
                max={12}
                defaultValue={7}
                className={field}
                required
              />
            </label>
            <label>
              Jumlah siswa
              <input
                name="count"
                type="number"
                min={1}
                max={40}
                defaultValue={32}
                className={field}
                required
              />
            </label>
          </div>
          <Button disabled={busy}>Simpan kelas</Button>
        </form>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <Link href={`/guru/kelas/${c.id}`} key={c.id} className={panel}>
            <h2 className="text-2xl font-bold">{c.label}</h2>
            <p>
              {c.count} siswa · Tingkat {c.grade}
            </p>
            <span className="inline-flex min-h-12 items-center font-semibold text-primary">
              Buka kelas →
            </span>
          </Link>
        ))}
      </div>
      {!classes.length && (
        <p>Belum ada kelas. Tambahkan rombel pertama Anda.</p>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
export function ClassPage({ id }: { id: string }) {
  const { scope, state, refresh } = useTeacher(),
    router = useRouter(),
    [detail, setDetail] = useState<{
      class: ClassDto;
      students: StudentDto[];
    }>(),
    [names, setNames] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<StudentDto>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const owner = scope.ownerId,
    mode = scope.mode;
  const [absent, setAbsent] = useState<string[]>([]),
    [savingPresence, setSavingPresence] = useState(false),
    today = jakartaDate();
  useEffect(() => {
    let cancelled = false;
    void classPresence({ ownerId: owner, mode }, id, today)
      .then((value) => {
        if (!cancelled) setAbsent(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [owner, mode, id, today]);
  const load = useCallback(async () => {
    const s = { ownerId: owner, mode };
    try {
      let data;
      if (navigator.onLine) {
        const res = await fetch(`/api/v1/classes/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        data = classDetailSchema.parse(await res.json());
        try {
          await libraryCache(s, "classDetail", id, data);
        } catch {
          /* Online class remains usable. */
        }
      } else data = await libraryCache(s, "classDetail", id);
      if (!data) throw new Error();
      setDetail(data);
      const repo = createNameRepository(s);
      try {
        if (state.sample) {
          const key = `pn-sample-local:${owner}:${id}`;
          if (!localStorage.getItem(key)) {
            for (const student of data.students)
              if (!(await repo.read(student.id)))
                await repo.save(
                  student.id,
                  `Awan ${String(student.attendanceNumber).padStart(2, "0")}`,
                );
            localStorage.setItem(key, "1");
          }
        }
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
        "Kelas belum dapat dibuka. Periksa sambungan atau cache perangkat.",
      );
    }
  }, [owner, mode, id, state.sample]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  if (!detail) return <p role="status">{message || "Memuat kelas…"}</p>;
  const classroom = detail.class;
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-12 items-center text-primary"
        href="/guru/kelas"
      >
        ← Kelas
      </Link>
      <h1 className="text-[28px] font-extrabold">Kelas {classroom.label}</h1>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/guru/mulai?class=${id}`}>Mulai mengajar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/guru/mulai?class=${id}&mode=assessment`}>
            Buat asesmen
          </Link>
        </Button>
      </div>
      <section className={panel}>
        <h2 className="text-xl font-bold">Daftar siswa</h2>
        <p className="text-sm text-muted-foreground">
          Nama hanya tersimpan pada perangkat ini. Riwayat mengikuti siswa walau
          nomor absen berubah.
        </p>
        <p className="text-sm">
          Hadir hari ini:{" "}
          {
            detail.students.filter((s) => s.active && !absent.includes(s.id))
              .length
          }
          /{detail.students.filter((s) => s.active).length}. Catatan hadir
          tersimpan pada perangkat ini.
        </p>
        <ul className="divide-y">
          {detail.students.map((s) => (
            <li
              key={s.id}
              className="flex min-h-16 flex-wrap items-center justify-between gap-3"
            >
              <span className="min-w-0 flex-1 break-words">
                <b className="mr-3">
                  {String(s.attendanceNumber).padStart(2, "0")}
                </b>
                {names[s.id] ?? `Absen ${s.attendanceNumber}`}
                {!s.active && <small className="ml-2">Diarsipkan</small>}
              </span>
              <label className="flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`Absen ${s.attendanceNumber} hadir`}
                  disabled={!s.active || savingPresence}
                  checked={s.active && !absent.includes(s.id)}
                  onChange={async (e) => {
                    const next = e.target.checked
                      ? absent.filter((value) => value !== s.id)
                      : [...absent, s.id];
                    const previous = absent;
                    setAbsent(next);
                    setSavingPresence(true);
                    try {
                      await classPresence(scope, id, today, next);
                      setMessage("Catatan hadir tersimpan di perangkat.");
                    } catch {
                      setAbsent(previous);
                      setMessage(
                        "Catatan hadir belum tersimpan. Periksa penyimpanan perangkat.",
                      );
                    } finally {
                      setSavingPresence(false);
                    }
                  }}
                />
                Hadir
              </label>
              <Button variant="outline" onClick={() => setSelected(s)}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          disabled={detail.students.length >= 40}
          onClick={() =>
            setSelected({
              schemaVersion: 1,
              id: crypto.randomUUID(),
              classId: id,
              attendanceNumber:
                Array.from({ length: 40 }, (_, i) => i + 1).find(
                  (n) => !detail.students.some((s) => s.attendanceNumber === n),
                ) ?? 40,
              active: true,
            })
          }
        >
          Tambah siswa
        </Button>
        {selected && (
          <form
            key={selected.id}
            className="space-y-3 rounded-input bg-pn-teal-100 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await libraryCall({
                  action: "roster",
                  classId: id,
                  studentId: selected.id,
                  attendanceNumber: Number(f.get("attendance")),
                  active: f.get("active") === "on",
                });
                const repo = createNameRepository(scope);
                try {
                  await repo.save(
                    selected.id,
                    String(f.get("localName") ?? ""),
                  );
                } finally {
                  repo.close();
                }
                setSelected(undefined);
                await load();
                await refresh();
                setMessage("Perubahan tersimpan.");
              } catch {
                setMessage(
                  "Belum tersimpan. Nomor absen harus unik antara 1–40.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block">
              Nomor absen
              <input
                className={field}
                name="attendance"
                type="number"
                min={1}
                max={40}
                defaultValue={selected.attendanceNumber}
                required
              />
            </label>
            <label className="block">
              Nama panggilan di perangkat ini
              <input
                name="localName"
                className={field}
                defaultValue={names[selected.id] ?? ""}
                maxLength={120}
              />
            </label>
            <label className="flex min-h-12 items-center gap-3">
              <input
                name="active"
                type="checkbox"
                defaultChecked={selected.active}
              />
              Siswa aktif (hapus centang untuk arsip)
            </label>
            <Button disabled={busy}>Simpan siswa</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(undefined)}
            >
              Batal
            </Button>
          </form>
        )}
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-primary">
            Impor dan nama lokal
          </summary>
          <LocalRoster
            ownerId={owner}
            mode={mode}
            students={detail.students}
            onSaved={load}
          />
        </details>
      </section>
      <details className={panel}>
        <summary className="min-h-12 cursor-pointer font-bold">
          Pengaturan kelas dan cek level
        </summary>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const res = await fetch(`/api/v1/classes/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: serializeUpdateClass({
                label: String(f.get("label")),
                grade: Number(f.get("grade")),
                revision: classroom.revision,
              }),
            });
            if (res.ok) {
              await load();
              await refresh();
            } else setMessage("Pengaturan belum tersimpan.");
          }}
        >
          <label className="block">
            Nama rombel
            <input
              name="label"
              defaultValue={classroom.label}
              className={field}
              required
            />
          </label>
          <label className="block">
            Tingkat
            <input
              type="number"
              name="grade"
              min={1}
              max={12}
              defaultValue={classroom.grade}
              className={field}
            />
          </label>
          <Button>Simpan pengaturan</Button>
        </form>
        <Button variant="outline" onClick={() => router.push("/guru/latihan")}>
          Buka Sesi Tepat Level
        </Button>
      </details>
      <p role="status">{message}</p>
    </div>
  );
}
