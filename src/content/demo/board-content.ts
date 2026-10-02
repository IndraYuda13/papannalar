// Public PRELIM display text only. No assessment keys, levels or student IDs.
export const PUBLIC_WEEKLY = [
  { text: "½ + ¼ = …", options: ["¾", "⅔", "¼", "1"] },
  { text: "0,5 meter = … sentimeter", options: ["5", "50", "500", "0,05"] },
  { text: "−3 − 5 = …", options: ["2", "−2", "−8", "8"] },
  { text: "−½ + ¾ = …", options: ["−¼", "−5/4", "5/4", "¼"] },
  {
    text: "2 buku berharga Rp6.000. Harga 5 buku adalah …",
    options: ["Rp15.000", "Rp12.000", "Rp9.000", "Rp30.000"],
  },
] as const;
export const MODE_LABELS = {
  opening: "Pembuka",
  check: "Cek Level",
  continuation: "Lanjutan",
  groups: "Kelompok",
  station: "Stasiun",
  together: "Berdua",
  split: "Panel Terbagi",
  spotlight: "Sorot",
  exit: "Kartu Keluar",
  reflection: "Refleksi",
} as const;
