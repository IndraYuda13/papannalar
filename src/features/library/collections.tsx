"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/features/guru/app-context";
import { Button } from "@/ui/components/button";
import {
  CHOICES,
  collectionDocumentSchema,
  collectionSchema,
  libraryItemSchema,
  publicLibraryItem,
  type DraftDocument,
  type Collection,
} from "@/contracts/library";
import { field, panel, libraryCall } from "./client";
import { LibraryItemView } from "./item-view";
import { defaultTool, ToolFields, TOOL_LABELS } from "./tool-fields";
import { InteractiveHelp } from "./interactive-help";
import { templateItem } from "./templates";
import { ActivityIcon } from "@/ui/components/activity-icon";
import { FileQuestion, Layers, Plus } from "lucide-react";
export function CollectionsPage() {
  const { state } = useTeacher(),
    [tab, setTab] = useState<"system" | "teacher">("system");
  const sets = state.collections.filter(
    (c) => c.source === tab && c.status !== "archived",
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-[28px] font-extrabold">
          <Layers size={28} className="text-primary" aria-hidden />
          Soal & Presentasi
        </h1>
        <Button asChild>
          <Link href="/guru/soal/baru">
            <Plus size={20} aria-hidden />
            Buat kumpulan soal
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">
        Simpan sekali, gunakan di berbagai kelas.
      </p>
      <div role="tablist" className="flex gap-2">
        {(["system", "teacher"] as const).map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "system" ? "Dari Sistem" : "Soal Saya"}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sets.map((c) => (
          <Link
            key={c.id}
            href={`/guru/soal/${c.id}`}
            className={`${panel} friendly-card`}
          >
            {c.document.kind === "cards" ? (
              <FileQuestion size={28} className="text-primary" aria-hidden />
            ) : (
              <ActivityIcon
                kind={
                  c.document.items.find((i) => i.kind === "interactive")?.tool
                    .kind ?? "writing"
                }
              />
            )}
            <h2 className="text-xl font-bold">
              {c.document.title || "Kumpulan tanpa judul"}
            </h2>
            <p>
              {c.document.kind === "cards"
                ? "Kartu Nalar"
                : "Interaktif di layar"}{" "}
              · {c.document.items.length} soal
            </p>
            <p className="text-sm text-muted-foreground">
              {c.status === "ready" ? "Siap digunakan" : "Draft"}
              {c.source === "system" ? " · Materi sistem" : ""}
            </p>
            <span className="inline-flex min-h-12 items-center font-semibold text-primary">
              Buka kumpulan →
            </span>
          </Link>
        ))}
      </div>
      {!sets.length && <p>Belum ada kumpulan. Mulai dari satu soal.</p>}
    </div>
  );
}
export function CollectionPage({ id }: { id: string }) {
  const { state } = useTeacher();
  const existing = state.collections.find((c) => c.id === id);
  if (id !== "baru" && !existing) return <p>Kumpulan tidak ditemukan.</p>;
  return <CollectionEditor key={id} initial={existing} />;
}
function CollectionEditor({ initial }: { initial?: Collection }) {
  const { refresh } = useTeacher(),
    router = useRouter();
  const [id, setId] = useState(() => initial?.id ?? crypto.randomUUID()),
    [revision, setRevision] = useState(initial?.revision ?? 0),
    [document, setDocument] = useState<DraftDocument>(
      initial?.document ?? { title: "", kind: "cards", items: [] },
    ),
    [source, setSource] = useState(initial?.source ?? "teacher"),
    [version, setVersion] = useState(initial?.version ?? 0),
    [preview, setPreview] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(initial?.status === "ready");
  const readonly = source === "system";
  function change(next: DraftDocument) {
    setDocument(next);
    setSaved(false);
    setErrors({});
  }
  function changeItem(index: number, item: DraftDocument["items"][number]) {
    change({
      ...document,
      items: document.items.map((old, i) => (i === index ? item : old)),
    });
  }
  async function save(ready: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const parsed = collectionDocumentSchema.safeParse(document);
      if (ready && !parsed.success) {
        setErrors(
          Object.fromEntries(
            parsed.error.issues.map((e) => [e.path.join("."), e.message]),
          ),
        );
        await persist(false);
        setMessage(
          "Draft tersimpan. Lengkapi isian yang ditandai sebelum siap digunakan.",
        );
        return;
      }
      await persist(ready);
      setMessage(
        ready ? "Kumpulan tersimpan dan siap digunakan." : "Draft tersimpan.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "CONFLICT"
          ? "Kumpulan telah berubah di perangkat lain. Salin isi sebelum memuat ulang."
          : "Belum tersimpan. Periksa isian alat dan internet.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function persist(ready: boolean) {
    const response = collectionSchema.parse(
      await libraryCall({ action: "save", id, revision, ready, document }),
    );
    setRevision(response.revision);
    setVersion(response.version);
    setSaved(ready);
    await refresh();
    if (!initial) history.replaceState(null, "", `/guru/soal/${id}`);
  }
  function add() {
    if (document.items.length >= 5) return;
    const next =
      document.kind === "cards"
        ? {
            id: crypto.randomUUID(),
            kind: "card" as const,
            prompt: "",
            options: ["", "", "", ""] as [string, string, string, string],
            key: "A" as const,
            explanation: "",
          }
        : {
            id: crypto.randomUUID(),
            kind: "interactive" as const,
            prompt: "",
            tool: defaultTool("number-line"),
          };
    change({ ...document, items: [...document.items, next] });
  }
  function errorAt(prefix: string) {
    const found = Object.entries(errors).filter(([key]) =>
      key.startsWith(prefix),
    );
    return found.length ? (
      <p role="alert" className="mt-1 text-sm text-red-800">
        {prefix.includes("options")
          ? "Isi empat pilihan yang berbeda."
          : prefix === "title"
            ? "Tuliskan nama kumpulan."
            : "Lengkapi pertanyaan dan isian alat."}
      </p>
    ) : null;
  }
  const previewResult = libraryItemSchema.safeParse(
    preview === null ? undefined : document.items[preview],
  );
  const previewItem = previewResult.success ? previewResult.data : undefined;
  return (
    <div className="space-y-5">
      <Link
        href="/guru/soal"
        className="inline-flex min-h-12 items-center text-primary"
      >
        ← Soal & Presentasi
      </Link>
      <h1 className="text-[28px] font-extrabold">
        {readonly
          ? document.title
          : initial
            ? "Edit kumpulan soal"
            : "Buat kumpulan soal"}
      </h1>
      {readonly && (
        <p>Materi sistem dapat dipakai langsung. Salin untuk mengubah soal.</p>
      )}
      {version > 0 && !readonly && (
        <p className="text-sm text-muted-foreground">
          Soal yang diubah berlaku untuk sesi baru. Hasil sesi lama tetap sama.
        </p>
      )}
      <label className="block font-semibold">
        Nama kumpulan
        <input
          className={field}
          value={document.title}
          maxLength={90}
          readOnly={readonly}
          onChange={(e) => change({ ...document, title: e.target.value })}
        />
        {errorAt("title")}
      </label>
      <label className="block font-semibold">
        Jenis kumpulan
        <select
          className={field}
          disabled={readonly || document.items.length > 0}
          value={document.kind}
          onChange={(e) =>
            change({
              ...document,
              kind: e.target.value === "interactive" ? "interactive" : "cards",
            })
          }
        >
          <option value="cards">Soal dengan Kartu Nalar</option>
          <option value="interactive">Interaktif di layar</option>
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        Maksimal 5 soal. Untuk Kartu Nalar, satu soal memakai satu baris.
      </p>
      {document.items.map((item, index) => (
        <article
          key={item.id}
          className={panel}
          aria-label={`Soal ${index + 1}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Soal {index + 1}</h2>
            {!readonly && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  disabled={index === 0}
                  aria-label={`Naikkan soal ${index + 1}`}
                  onClick={() => {
                    const items = [...document.items];
                    [items[index - 1], items[index]] = [
                      items[index],
                      items[index - 1],
                    ];
                    change({ ...document, items });
                  }}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Hapus soal ${index + 1}`}
                  onClick={() =>
                    change({
                      ...document,
                      items: document.items.filter((_, i) => i !== index),
                    })
                  }
                >
                  Hapus
                </Button>
              </div>
            )}
          </div>
          <label className="block">
            Pertanyaan
            <textarea
              className={field}
              rows={2}
              value={item.prompt}
              maxLength={400}
              readOnly={readonly}
              onChange={(e) =>
                changeItem(index, { ...item, prompt: e.target.value })
              }
            />
            {errorAt(`items.${index}.prompt`)}
          </label>
          {item.kind === "card" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {CHOICES.map((label, n) => (
                  <label key={label}>
                    Pilihan {label}
                    <input
                      className={field}
                      value={item.options[n]}
                      maxLength={400}
                      readOnly={readonly}
                      onChange={(e) => {
                        const options = [...item.options] as [
                          string,
                          string,
                          string,
                          string,
                        ];
                        options[n] = e.target.value;
                        changeItem(index, { ...item, options });
                      }}
                    />
                  </label>
                ))}
              </div>
              {errorAt(`items.${index}.options`)}
              <label className="block">
                Kunci jawaban
                <select
                  className={field}
                  value={item.key}
                  disabled={readonly}
                  onChange={(e) =>
                    changeItem(index, {
                      ...item,
                      key: CHOICES.find((c) => c === e.target.value) ?? "A",
                    })
                  }
                >
                  {CHOICES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                Penjelasan guru (opsional)
                <textarea
                  className={field}
                  rows={2}
                  value={item.explanation}
                  maxLength={600}
                  readOnly={readonly}
                  onChange={(e) =>
                    changeItem(index, { ...item, explanation: e.target.value })
                  }
                />
              </label>
              <p className="text-sm">
                Pilihan ? / Belum tahu sudah disediakan.
              </p>
            </>
          ) : (
            <>
              <label className="block">
                Aktivitas
                <select
                  className={field}
                  disabled={readonly}
                  value={item.kind === "writing" ? "writing" : item.tool.kind}
                  onChange={(e) =>
                    changeItem(
                      index,
                      e.target.value === "writing"
                        ? { id: item.id, prompt: item.prompt, kind: "writing" }
                        : {
                            id: item.id,
                            prompt: item.prompt,
                            kind: "interactive",
                            tool: defaultTool(e.target.value),
                          },
                    )
                  }
                >
                  {TOOL_LABELS.map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {!readonly && (
                <InteractiveHelp
                  key={item.kind === "writing" ? "writing" : item.tool.kind}
                  kind={item.kind === "writing" ? "writing" : item.tool.kind}
                  onApply={(template) => {
                    changeItem(index, templateItem(item.id, template));
                    setPreview(null);
                  }}
                />
              )}
              {item.kind === "interactive" && !readonly && (
                <ToolFields
                  tool={item.tool}
                  onChange={(tool) => changeItem(index, { ...item, tool })}
                />
              )}{" "}
              {errorAt(`items.${index}.tool`)}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const single = collectionDocumentSchema.safeParse({
                ...document,
                title: document.title || "Pratinjau",
                items: [item],
              });
              if (!single.success) {
                setMessage("Lengkapi soal sebelum membuka preview.");
                return;
              }
              setPreview(index);
            }}
          >
            Preview soal {index + 1}
          </Button>
        </article>
      ))}
      {!readonly && (
        <Button
          variant="outline"
          disabled={document.items.length >= 5}
          onClick={add}
        >
          Tambah soal
        </Button>
      )}
      {previewItem && preview !== null && (
        <section className={panel} aria-label="Pratinjau soal">
          <Button variant="outline" onClick={() => setPreview(null)}>
            Tutup preview
          </Button>
          <div
            data-library-preview
            className="min-h-0 rounded-input bg-pn-board p-4"
          >
            <LibraryItemView
              key={
                previewItem.kind === "interactive"
                  ? `${previewItem.id}:${JSON.stringify(previewItem.tool)}`
                  : previewItem.id
              }
              item={publicLibraryItem(previewItem)}
              row={preview + 1}
            />
          </div>
        </section>
      )}
      {preview !== null && !previewItem && (
        <section className={panel} aria-label="Pratinjau soal">
          <Button variant="outline" onClick={() => setPreview(null)}>
            Tutup preview
          </Button>
          <p role="status">
            Periksa isian yang diubah untuk melanjutkan preview.
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-3 border-t pt-4">
        {readonly ? (
          <Button
            variant="outline"
            onClick={() => {
              setId(crypto.randomUUID());
              setRevision(0);
              setVersion(0);
              setSource("teacher");
              setSaved(false);
              setMessage(
                "Salinan siap diedit. Simpan untuk menambahkannya ke Soal Saya.",
              );
            }}
          >
            Salin ke Soal Saya
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void save(false)}
            >
              Simpan draft
            </Button>
            <Button disabled={busy} onClick={() => void save(true)}>
              Simpan & siap digunakan
            </Button>
          </>
        )}
        {(saved || readonly) && (
          <Button
            variant="outline"
            onClick={() => router.push(`/guru/mulai?collection=${id}`)}
          >
            Gunakan di kelas
          </Button>
        )}
        {!readonly && revision > 0 && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Arsipkan kumpulan? Riwayat hasil tetap tersimpan.",
                )
              )
                return;
              await libraryCall({ action: "archive", id, revision });
              await refresh();
              router.push("/guru/soal");
            }}
          >
            Arsipkan
          </Button>
        )}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
