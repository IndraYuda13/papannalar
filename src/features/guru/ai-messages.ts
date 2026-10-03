import type { FallbackReason } from "@/contracts/bisik";
export function aiFallbackMessage(reason: FallbackReason): string {
  switch (reason) {
    case "disabled":
      return "Layanan AI belum diaktifkan oleh pengelola.";
    case "unreviewed":
      return "Materi ini belum disahkan untuk bantuan AI.";
    case "privacy":
      return "Pertanyaan bebas menunggu review privasi atau perlu dihapus identitasnya.";
    case "budget":
      return "Anggaran AI untuk saat ini sudah habis.";
    case "rate":
      return "Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.";
    case "frozen":
      return "Latihan sudah digunakan dalam sesi dan tidak dapat diubah.";
    case "active":
      return "Permintaan sebelumnya masih diproses.";
    case "offline":
      return "Sambungkan internet untuk meminta bantuan AI.";
    case "timeout":
      return "Layanan AI terlalu lama merespons. Coba lagi nanti.";
    default:
      return "Layanan AI belum dapat menjawab. Coba lagi nanti.";
  }
}
