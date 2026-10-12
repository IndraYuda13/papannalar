import type { PresentationState } from "@/contracts/presentation";

export type BoardCopy = {
  /** Above the heading: what this screen is and where it sits in the session. */
  role: string;
  /** Below the content, non-question screens only: what happens next. */
  next?: string;

  beat:
    | "siar"
    | "question"
    | "groups"
    | "station"
    | "exit"
    | "reflection"
    | "close"
    | "idle";
};

export function boardCopy(state: PresentationState): BoardCopy {
  const questionRole =
    "Soal cek. Isi satu pilihan saja; jika belum tahu, pilih ?.";
  if (state.practice)
    return {
      role: "Latihan mandiri. Setiap orang mengerjakan bagiannya sendiri.",
      beat: "question",
    };
  if (state.check)
    return {
      role: questionRole,
      beat: "question",
    };
  if (state.mode === "split")
    return {
      role: "Dua kelompok mengerjakan dua soal berbeda di papan yang sama.",
      next: "Kerjakan bagian kelompokmu. Papan berganti lagi saat guru menekan lanjut.",
      beat: "station",
    };
  if (state.mode === "spotlight")
    return {
      role: "Satu kelompok sedang ditampilkan ke seluruh kelas.",
      next: "Perhatikan cara kelompok ini menyelesaikan soal, lalu bandingkan dengan caramu.",
      beat: "station",
    };
  switch (state.mode) {
    case "opening":
    case "continuation":
      return {
        role: "Halaman pembuka. Baca soal berikut, lalu jawab di tempatmu.",
        next: "Guru mengarahkan kapan mulai mengerjakan kartu.",
        beat: "siar",
      };
    case "groups":
      return {
        role: "Soal cek sudah selesai. Sekarang papan menampilkan pembagian kelompok, bukan soal.",
        next: "Langkah berikutnya: pindah ke stasiun kelompokmu, lalu kerjakan tugas kelompok di sana. Guru memberi aba-aba waktu dan perpindahan dari HP.",
        beat: "groups",
      };
    case "station":
    case "together":
      return {
        role: "Tugas kelompok di stasiun. Kerjakan bersama, lalu siapkan cara menjelaskannya.",
        next: "Papan berganti lagi saat guru memindahkan kelompok ke stasiun berikutnya.",
        beat: "station",
      };
    case "exit":
      return {
        role: "Kartu cek akhir. Tuliskan nomor absen, satu pilihan jawaban, dan alasanmu.",
        next: "Setelah kartu dikumpulkan, kelas membahas jawaban bersama.",
        beat: "exit",
      };
    case "reflection":
      return {
        role: "Penutup. Tulis tiga kalimat refleksi tentang cara berpikirmu hari ini.",
        next: "Guru menutup sesi setelah refleksi terkumpul.",
        beat: "reflection",
      };
    default:
      return { role: "", beat: "question" };
  }
}
