# Demo dan pemulihan lokal

Prasyarat dan perintah build ada di [README](../README.md). Panduan ini berlaku
untuk lingkungan uji terpisah, tanpa data siswa nyata atau layanan hosted.

## Memilih demo

- `pnpm video`: menyiapkan data contoh dan membuka alur aplikasi utama melalui
  `/masuk` → **Coba dengan data contoh**. Gunakan panduan guru untuk mencoba
  kelas, soal, asesmen, cetak kartu dan hasil.
- `pnpm demo`: menyediakan akses fixture terpisah melalui `/demo`.
- `pnpm demo --smoke`: memeriksa startup launcher lalu menghentikannya.

Aplikasi berjalan pada `http://127.0.0.1:3100`, provider Auth/HTTP khusus tes pada
port 54325, dan PostgreSQL uji pada port 55432 dengan database `pn_m01c_test`.
Siapkan database terlebih dahulu. Launcher dapat memulai cluster existing di
`.local/m01c-pg`, tetapi tidak membuat cluster atau database baru otomatis.

Launcher menyiapkan schema uji dan migration, menghasilkan secret HMAC sementara,
dan tidak mengirim email. Ctrl+C menghentikan proses miliknya. Jangan menjalankan
launcher bersamaan dengan full verify. Untuk melihat papan, buka `/layar` di
jendela lain. Loopback bukan akses kamera/QR lintas perangkat melalui HTTPS.

## Menghasilkan manifest kandidat

```sh
pnpm exec node scripts/release-manifest.mjs
```

Setelah build tersedia, script menghasilkan
`artifacts/releases/local-final-mvp/manifest.json` dengan hash source, migration,
dependency, build ID, aset dan hasil gladi lokal bila tersedia. Hasil dari build
berbeda ditolak. Output ini diabaikan Git; bukan tautan ke bukti yang sudah
tersedia dalam repository. Bukti yang disertakan ada di [artifacts/qa](../artifacts/qa/).

## Memulihkan backup uji

Backup lokal tidak disertakan dalam Git. Gunakan hanya backup emulator uji milik
Anda, bukan backup Supabase hosted. Sediakan cluster terpisah dengan database
kosong bernama `pn_m01c_test`; tentukan port sebenarnya melalui
`TEST_DATABASE_URL`. Script menolak database berisi dan tujuan nonlokal/nonuji.

Contoh pada cluster uji terpisah di port 55435:

```sh
export TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55435/pn_m01c_test
pnpm exec node scripts/restore-local-backup.mjs /path/to/test-backup.dump
pnpm test:db:prepare
pnpm test:rls
```

`PSQL_BIN` dan `PG_RESTORE_BIN` dapat menunjuk executable PostgreSQL bila tidak
ada pada PATH. Restore berjalan dalam transaksi dan mempertahankan CHECK, RLS,
grant serta trigger. Jangan menghapus IndexedDB guru atau antrean jawaban yang
belum tersinkron untuk memulihkan database uji.

## Batas demo

- Auth/HTTP disimulasikan; data diuji dengan RLS PostgreSQL nyata. Hasil lokal
  tidak membuktikan layanan Auth/Realtime hosted atau pengiriman email.
- Kartu diunduh melalui UI; lihat [panduan cetak](13_GUIDE_LATIHAN_AI.md#mencetak-kartu-nalar).
  Pemindaian fisik, pencetakan dan papan sentuh memerlukan uji perangkat.
- Cache offline disiapkan dari build, bukan dev server. Buka online terlebih
  dahulu; pairing cloud tetap memerlukan internet.
- AI live memerlukan konfigurasi, anggaran dan review sesuai
  [panduan pengelola](12_AI_COMPAT_SPEC.md#panduan-pengelola-ai).
- Materi otomatis masih memerlukan review pedagogi dan uji kelas. Fixture bukan
  persetujuan penggunaan di kelas sungguhan.
