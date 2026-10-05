# Panduan pengembangan PapanNalar

## Mulai bekerja

- Baca README, spesifikasi yang relevan di `docs/08_TECH_SPEC.md` (termasuk
  register konflik), kode terkait, dan status Git sebelum mengubah implementasi.
- Instruksi terbaru pengguna menentukan ruang lingkup. Jangan menjalankan ulang
  rencana milestone historis atau scaffold proyek existing.
- Sumber produk ada di `docs/00`–`docs/07`; pertahankan isi sumber tersebut.
  Proposal desain, hasil pengujian dan persetujuan manusia harus dibedakan.
- Gunakan Node/pnpm yang dipin, satu lockfile, dan pola arsitektur existing.
  Pertahankan perubahan pengguna; jangan reset atau force-push.

## Kontrak yang wajib dijaga

- Nama siswa hanya di perangkat guru; tidak ke server, papan, AI, URL atau log.
  Foto kartu diproses lokal; tulisan/refleksi bebas hanya di RAM.
- Proyeksi papan menggunakan allowlist, tanpa nama, skor, kunci individu,
  level/mastery atau state privat guru.
- Matematika, generator soal/kunci, BKT, grouping, scheduler dan OMR deterministik.
  Core tidak mengimpor AI/network. Scan, koreksi dan sync ulang harus idempoten.
  Jawaban kosong/tidak terbaca berbeda dari pilihan “Belum tahu”.
- Pertahankan auth/RLS, pemisahan data contoh dan kelas asli, versi soal serta
  histori jawaban. Secret hanya di server, bukan variabel publik/bundle browser.
- AI opsional dengan fallback statis. Konfigurasi provider harus sesuai ledger,
  batas token, harga dan anggaran. Review materi/privasi tidak boleh dipalsukan.
- Jangan deploy, menjalankan migration DB nyata atau API berbayar tanpa izin.
  Gunakan data sintetis untuk tes; fixture bukan bukti provider/perangkat live.

## UI dan pengujian

- Bahasa Indonesia yang jelas; alur utama guru mengikuti panduan penggunaan di
  `docs/13_GUIDE_LATIHAN_AI.md`. Utamakan HP, keyboard dan target sentuh memadai.
- Model matematika tetap akurat dan berfungsi tanpa WebGL. 3D pendukung dimuat
  terpisah/lazy, dengan poster dan dukungan reduced motion.
- Gunakan schema strict pada batas sistem, adapter storage/network dan fungsi
  domain murni. Hindari aturan duplikat, `any` dan suppression tanpa alasan.
- Jalankan tes terarah sesuai perubahan. `pnpm verify` mencakup format, types,
  lint, unit, integrasi/RLS, build dan E2E; siapkan DB uji terlebih dahulu.
- Jangan menghapus atau melemahkan tes agar lulus. Perubahan visual diperiksa
  di browser; jangan mengklaim semua alur lulus hanya karena build berhasil.
- Bukti pengujian berada di `artifacts/qa/`. Catat command, hasil aktual,
  identitas kandidat serta batas yang belum diuji. Pertahankan bukti historis.
- Laporkan perubahan, validasi dan blocker tanpa mengarang approval atau
  kesiapan production. Keputusan baru dicatat pada spesifikasi yang relevan.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
