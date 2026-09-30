import type { GeneratedQuestion } from "../templates/types";
import { contentHash, integerText as n, promptText } from "../templates/format";

export function withContext(q: GeneratedQuestion): GeneratedQuestion {
  const { a, b, c, d } = q.params;
  let text: string;
  switch (q.stepId) {
    case "A1":
      text = `Dua keranjang berisi ${a} dan ${b} jeruk. Keranjang yang lebih banyak berisi berapa jeruk?`;
      break;
    case "A2":
      text = `Ada ${a} kelereng, lalu mendapat ${b} lagi. Berapa seluruh kelereng?`;
      break;
    case "A3":
      text = `Buku memiliki ${a * 10 + b} halaman. Berapa ikatan sepuluh halaman yang penuh?`;
      break;
    case "A4":
    case "B4":
      if (d) {
        text = `Ada ${c} potong kue. ${b === 2 ? "Setengah" : "Seperempat"} dibagikan. Berapa potong yang dibagikan?`;
        break;
      }
      text = `Martabak dibagi ${b} sama besar. Diambil ${a} potong. Berapa bagian martabak yang diambil?`;
      break;
    case "B1":
      text = `Persediaan ${a} buku ditambah ${b} buku. Berapa buku seluruhnya?`;
      break;
    case "B2":
    case "B3":
      text = `${a * b} kursi disusun dalam ${a} baris sama banyak. Berapa kursi tiap baris?`;
      break;
    case "C1":
      text = `${n(a * b)} botol dibagikan rata untuk ${b} hari. Berapa botol setiap hari?`;
      break;
    case "C2":
      text = `Dua lampu berkedip setiap ${a} dan ${b} detik. Keduanya baru berkedip bersama. Berapa detik lagi pertama kali bersama?`;
      break;
    case "C3":
    case "D2":
      text = `Resep memakai ${a}/${b} gelas air, ditambah ${c}/${d} gelas lagi. Berapa gelas air seluruhnya?`;
      break;
    case "C4":
      text = `${a} pensil berharga Rp${n(a * b)}. Berapa rupiah harga satu pensil?`;
      break;
    case "D1":
      text = `Lift mulai di lantai ${n(a)}, lalu turun ${b} lantai. Lantai dasar bernomor 0. Berapa nomor lantai akhirnya?`;
      break;
    case "D3":
      text = `Resep memakai ${a} gelas teh untuk ${b} gelas air. Untuk ${a * c} gelas teh, berapa gelas air agar rasanya sama?`;
      break;
    case "D4":
      text = `Ada ${a} paket. Tiap paket berisi x pensil dan ${b} pensil tambahan. Bentuk aljabar jumlah seluruh pensil adalah …`;
      break;
    case "D5":
      text = `Harga ${a} buku masing-masing x ribu rupiah dikurangi potongan ${-b} ribu rupiah menjadi ${a * c + b} ribu rupiah. Berapa nilai x?`;
      break;
    case "D6":
      text = `Biaya layanan y ribu rupiah adalah ${a}x + ${b}, untuk x satuan pemakaian. Berapa nilai y untuk ${c} satuan?`;
      break;
    case "E1":
      text = `Koloni bertambah ${a} kali setiap tahap, selama ${b} tahap lalu ${c} tahap lagi. Jumlah akhirnya ${a} dipangkatkan berapa kali jumlah awal?`;
      break;
    case "E2":
      text = `Kotak memuat paling banyak ${c} benda. x buku dan y pulpen, masing-masing tidak negatif. Pasangan (x, y) mana dapat dimasukkan?`;
      break;
    case "E3":
      text = `Kebun luasnya ${a * b} m²; jumlah panjang dan lebarnya ${a + b} m. Panjang salah satu sisi x memenuhi x² − ${a + b}x + ${a * b} = 0. Semua ukuran x yang mungkin adalah …`;
      break;
    case "E4":
      text = `Koloni bertambah ${a} kali per tahap. Setelah x + ${b} tahap menjadi ${n(a ** c)} kali jumlah awal. Berapa x?`;
      break;
  }
  return {
    ...q,
    prompt: [{ kind: "text", text }],
    metadata: {
      ...q.metadata,
      contentHash: contentHash(`${q.metadata.contentHash}:${text}`),
    },
  };
}
export const contextPlainText = (q: GeneratedQuestion) =>
  promptText(withContext(q).prompt);
