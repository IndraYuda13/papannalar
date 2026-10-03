import type { SyncQueueEntry } from "@/local/sync";

export function syncAttentionMessage(
  entries: readonly Pick<SyncQueueEntry, "state">[],
) {
  return entries.some((entry) => entry.state === "review")
    ? "Ada jawaban berbeda dari perangkat lain. Periksa sebelum memilih versi yang disimpan."
    : entries.some((entry) => entry.state === "login")
      ? "Masuk kembali untuk menyimpan jawaban secara online. Jawaban pada perangkat ini tetap ada."
      : "";
}
