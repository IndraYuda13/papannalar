# Handoff kandidat software lokal

Snapshot 30 September 2026; bukan pelaksanaan freeze atau final bulan Oktober.
Rujukan status: PLAN §9.44 dan seterusnya. Delapan dokumen sumber tidak diubah.

## Jalankan

Node 24.14.1, pnpm 11.19.0, PostgreSQL 17. Dari repository:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm demo
```

`http://127.0.0.1:3100/demo` → masuk demo lokal; papan di `/layar` pada jendela
terpisah. Proses launcher harus tetap hidup. Ia memakai cluster uji lokal yang
sudah ada; setup mesin baru dijelaskan di README. Demo tidak memakai email live.
Untuk kelas baru tanpa seed: pilih data pilot dan jalur paket sesi; jangan membawa
data anak nyata ke lingkungan demo/uji.

## Identitas build dan evidence

`pnpm exec node scripts/release-manifest.mjs` menghasilkan
`artifacts/releases/local-final-mvp/manifest.json`: hash source, migration,
dependency, build ID, aset offline/font dan hasil gladi lokal bila sudah tersedia.
Manifest menolak hasil gladi dari build berbeda. PLAN/jurnal tidak ikut hash source.
File aplikasi belum di-commit; base Git saja tidak mengidentifikasi implementasi.

Audit13 fitur ada di `artifacts/qa/M15/feature-audit.md`. Rekaman M17 berlabel
**REKAMAN UJI LOKAL · kartu sintetis**; kode pairing disembunyikan. Tiga pengulangan
otomatis mengikuti urutan sumber dengan waktu dipercepat, bukan gladi panggung
enam menit. Pratinjau alat tidak menambah giliran; rekaman membedakannya dari
actual-start. Bisik memakai strategi statis dan hasil exit menunjukkan denominator
nyata; hasil kelas lengkap tidak direkayasa untuk presentasi.

## Backup dan pemulihan lokal

Backup PostgreSQL uji berada di `.local/` yang diabaikan Git. Salinan ini memuat
auth/realtime emulator, sehingga **tidak untuk restore ke Supabase hosted**.
Pertahankan backup/build lama; jangan menghapus DB atau mengubah migration lama.
Pada cluster loopback baru dengan database kosong bernama `pn_m01c_test`:

```powershell
$env:PSQL_BIN='C:\Program Files\PostgreSQL\17\bin\psql.exe'
$env:PG_RESTORE_BIN='C:\Program Files\PostgreSQL\17\bin\pg_restore.exe'
$env:TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55435/pn_m01c_test'
pnpm exec node scripts/restore-local-backup.mjs .local/pre-m15-release-pg.dump
pnpm test:db:prepare
pnpm test:rls
```

Pilih port cluster kosong yang sebenarnya;55435 telah dipakai pengujian restore.
Script menolak DB berisi, mengurutkan data skema validator sebelum paket, dan
menjaga CHECK/RLS/grant/trigger. Restore dijalankan satu transaksi. Uji aktual:
32 migration,7 skema validator,3 paket valid;340 SQL assertions lulus sesudahnya.
Nama lokal guru tidak ada dalam backup server. Rollback perangkat/browser belum
boleh menghapus IndexedDB guru atau antrean yang belum tersinkron.

## Cadangan dan batas final

- Kartu A4 kosong: `artifacts/qa/M03/m03a/{initial,weekly,exit}.pdf`.
- Font terdistribusi melalui dependency berlisensi; build mengemas shell dan font
  lokal. Buka online sekali dan cek Kesiapan offline sebelum mencabut koneksi.
- Kamera gagal: Input manual; layar tanpa sentuhan: kendali HP saat terhubung;
  aplikasi gagal: rekaman lokal yang dilabeli rekaman. Salinan flashdisk belum diuji.
- Cloud pairing tetap perlu internet. Hotspot tanpa internet tidak menggantikan
  provider cloud. Cache papan hanya konten; roster dan goresan tidak dipersistkan.
- K01: asesmen22 langkah/enam alat tidak berarti alat interaktif untuk semua langkah.
  F9–F13 ditunda; F14/F15 dan empat alat tambahan di luar MVP.
- Kamera/cetak/fotokopi/digitizer/latensi nyata, hosted Auth/Realtime/staging,
  panggilan AI live, review pedagogi/privasi dan consent/pilot: NOT_RUN/NEEDS_REVIEW.
  Tidak ada klaim99% scanner,3 detik atau95% satu Pilot berdasarkan data sintetis.
