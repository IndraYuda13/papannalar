# PapanNalar — rekaman lokal

Status: V1–V6 selesai untuk rekaman lokal. Server `pnpm video` sudah berjalan
pada port3100; `/masuk` dan `/layar` HTTP200 serta smoke browser7/7 PASS.
Data contoh sintetis, bukan hasil pilot. Hosted/HP/perangkat fisik belum diuji;
tidak ada deployment/migration production.

## Jalankan dan buka

Di PowerShell, dari `E:\Lomba\repo-papannalar`:

```powershell
pnpm video
```

Biarkan terminal ini berjalan. Perintah memakai build yang sudah tersedia,
menyiapkan migration lokal secara idempoten dan mempertahankan data contoh.
Prasyarat lingkungan saat ini: PostgreSQL17 lokal `.local/m01c-pg`, port55432,
database `pn_m01c_test`; Node24.14.1/pnpm11.19.0. Instalasi PostgreSQL baru tidak
dibuat otomatis. Untuk perubahan kode gunakan `pnpm video:dev`; rekam dengan
`pnpm video` setelah build.

- Guru: <http://127.0.0.1:3100/masuk> → **Coba dengan data contoh** → `/guru`.
- Papan: <http://127.0.0.1:3100/layar>, tab/browser terpisah.
- Menu utama: `/guru/kelas`, `/guru/soal`, `/guru/asesmen`.
- Sesi dan hasil: `/guru/sesi/<id>`, `/guru/hasil/<id>`.
- Jalur adaptif existing: `/guru/latihan`; bukan beranda utama.

Pada kunjungan pertama papan, pilih Ringkas/Seimbang/Besar lalu **Simpan
tampilan**. Untuk laptop/HDMI tanpa touch, **Gunakan tanpa sentuhan** di tes
kemampuan. Profil digunakan lagi pada browser/origin yang sama.

Loopback ini memakai PostgreSQL nyata dan provider Auth/PostgREST uji lokal,
bukan Supabase hosted/Realtime live. QR smartphone sengaja tidak menawarkan URL
127.0.0.1. Untuk rekaman dua jendela pada komputer ini, masukkan kode enam digit
papan pada halaman sesi guru. HP fisik memerlukan origin HTTPS yang dapat
dijangkau kedua perangkat dan layanan hosted; jangan membagikan provider uji.

## Dataset siap pakai

Satu akun contoh persisten namespace `recording-v1`; login tidak membuat akun,
workspace atau seed baru. Dataset awal:

| Data              | Isi                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------- |
| Kelas             | 7B dan 7C, masing-masing32 siswa                                                       |
| Nama lokal fiktif | Awan01–32, dibuat hanya di browser saat detail kelas dibuka                            |
| Dari Sistem       | Petualangan Bilangan Bulat (3 soal); Mengenal Pecahan (2 soal)                         |
| Soal Saya         | Bilangan Bulat — Pertemuan1 (5 kartu); Eksplorasi dan Cerita Bilangan (alat + Menulis) |
| Riwayat awal      | 7B tanggal27/09/2026, 7C tanggal28/09/2026; tiga respons sintetis per sesi             |
| Asesmen awal      | 7B tanggal30/09/2026, siap diisi                                                       |

Tes menambah koleksi/sesi sintetis dengan judul `Latihan rekaman …` dan
`Interaktif rekaman`; itu bukan hasil kelas nyata. Pilih judul dataset awal di
atas untuk rekaman. Nama tidak berasal dari database dan tidak pulih di browser
lain tanpa impor CSV lokal. Akun contoh memegang satu lease kendali; browser
lain dapat melihat dataset sama, tetapi takeover harus eksplisit.

## Empat alur rekaman

1. **Kelas dan mengajar.** Buka Kelas7B → Mulai mengajar → Dari Sistem →
   Petualangan Bilangan Bulat → Mulai/Lanjutkan sesi. Buka papan, masukkan kode,
   tekan Hubungkan papan. Mainkan Garis Bilangan/Lift lalu Jalankan. Pindah
   soal hingga3; reconnect mempertahankan soal. Progres model tersimpan saat
   Jalankan pada browser papan itu; gambar/tulisan bebas hanya RAM.
2. **Authoring.** Soal & Presentasi → Buat kumpulan soal. Isi lima pertanyaan,
   empat pilihan berbeda dan kunci. Preview lalu tutup; isian tetap ada.
   Simpan & siap digunakan. Interaktif mendukung enam alat existing dan
   Menulis; maksimal lima soal per kumpulan, satu kartu lima baris.
3. **Asesmen dan hasil.** Asesmen & Hasil → Buat asesmen → 7B → Soal Saya →
   Bilangan Bulat — Pertemuan1 → tanggal → Simpan & mulai. Cetak kartu asesmen
   ukuran100%. Pindai foto/kamera lokal atau Input manual. Contoh respons benar:
   `A,C,D,B,C`; `?` adalah jawaban Belum tahu, berbeda dari Belum masuk. Simpan,
   Buka hasil tersimpan, reload. Kunci dinilai ulang server dari versi beku.
   Koreksi menjadi revisi; scan ulang identik tidak menambah hasil.
4. **Reuse dan offline.** Gunakan kumpulan yang sama di7C: hasil terpisah.
   Edit kumpulan membuat versi berikutnya; hasil lama tetap memakai kunci lama.
   Buka dua sesi saat online dahulu; offline buka `/guru` → pilih kelas/materi
   tersimpan. Jawaban offline menunggu sync; pairing cloud memerlukan internet.

Akhiri sesi untuk menutup presentasi; **Putuskan layar** mencabut sambungan.
**Keluar akun** mengunci cache guru dan mencabut kendali tab tersebut. Putus
jaringan sendiri tidak mengakhiri sesi. Profil tampilan tidak menyimpan token.

## Validasi aktual

- Full `pnpm verify` sekali **exit1**: format/typecheck/lint,1001 unit/65 file,
  378 SQL dan build PASS; browser awal66 PASS/36 FAIL. Seluruh failure ditutup
  dengan perbaikan dan tes terarah, tanpa mengulang full verify.
- Ledger akhir **102 skenario browser unik PASS**,0 failure tersisa melalui
  full+repair. Bukan klaim satu run102 baru. Kandidat terakhir **26/26 PASS,2.0m**;
  smoke pada server rekaman yang sedang berjalan **7/7 PASS,11.8s**.
- Regresi auth/clock **56 unit/5 file PASS** termasuk16 tes baru. Cookie PKCE
  per-flow dibersihkan, ACK memakai clock heartbeat presisi; pengaman tetap ada.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` terakhir exit0; coverage full
  statements92.44%/branches87.42%. Build `8wosRzK9Zg6KTtOoogpnf`,
  cache `pn-shell-920000846a3f1f88`,63 aset/3 shell publik.
- `pnpm format:check` dan `git diff --check` akhir exit0.
- Display14 browser/39 unit, koneksi73 unit, SQL tambahan library23/koneksi15,
  custom-form55 + OMR terpilih16, progress/CSV19 lulus pada batch terkait.
- Reset salah target/konfirmasi/sesi aktif ditolak dengan fingerprint data
  tetap (3 pemeriksaan; reset sukses NOT_RUN). Tidak menghapus tambahan data QA.
- Screenshot utama: `artifacts/qa/video-ready/teacher-{360,390,1366}.png`.
  Bukti tampilan: `artifacts/qa/video-ready/ui/`; scan memakai piksel sintetis,
  bukan bukti foto kartu cetak atau kamera fisik.
- Bukti ringkas/ledger: `artifacts/qa/video-ready/final-evidence.json`;
  log full `final-verify.log`, kandidat `candidate-browser-run.log`,
  smoke `running-server-smoke.log`, startup `recording-server.log`.

| Alur | Hasil engineering lokal                                                      |
| ---- | ---------------------------------------------------------------------------- |
| U01  | PASS: satu akun/dataset DB, reload/relogin di route utama                    |
| U02  | PASS: nama/hadir lokal, UUID stabil, export lokal dan guard network          |
| U03  | PASS: materi sistem, session/board dan model produksi                        |
| U04  | PASS: offline HP pada soal3, auto-recovery/rebind menjaga progres            |
| U05  | PASS: revoke/logout/takeover/QR lama dan controller lama ditolak             |
| U06  | PASS:3 preset, profil tersimpan, resize/reload/fullscreen                    |
| U07  | PASS otomatis: release/auto-next1/2/4 pointer; mouse/fallback; fisik NOT_RUN |
| U08  | PASS: editor5 kartu, validasi, preview dan save/reload                       |
| U09  | PASS: koleksi yang sama di7B/7C, hasil terpisah                              |
| U10  | PASS:6 alat + Menulis, model/ink tetap saat pindah halaman/preview           |
| U11  | PASS: cetak,3 respons, hasil DB, filter kelas/tanggal/set dan rincian        |
| U12  | PASS: rescan idempoten, revisi dan binding form/versi salah ditolak          |
| U13  | PASS: edit versi/arsip roster mempertahankan hasil/kunci lama                |
| U14  | PASS: guru lain, board anon dan visitor tidak membaca data private           |
| U15  | PASS: dua kelas cached, sync pending sekali, logout mengunci cache           |
| U16  | PASS: viewport guru/papan, konten400 karakter, kontrol bounded/font/runtime  |

Command kandidat aktual memakai Playwright production config; smoke memakai
server `pnpm video` yang sudah berjalan dengan reuse, bukan build/dev baru:

```powershell
$env:PSQL_BIN='C:\Program Files\PostgreSQL\17\bin\psql.exe'
$env:PAPANNALAR_REUSE_LOCAL_DEMO='1'
pnpm exec playwright test tests/e2e/shell.spec.ts tests/e2e/video-connection-logout.spec.ts tests/e2e/auth-ownership.spec.ts:87 --reporter=list,json
```

Full verify awal menemukan regresi UI lama serta defect PKCE/clock/refleksi/
pembesaran yang sudah diperbaiki. Assertion privasi, math dan RLS dipertahankan.
Refleksi kosong dan guru390 diperiksa secara visual;9 kombinasi preset/viewport
refleksi muat tanpa scroll. Warning launcher Node24.19 vs child24.14.1,
NO_COLOR dan bundling `use client` pada fixture tidak memblokir aplikasi.
TRUE BLOCKER coding: tidak ada. Ini walkthrough engineering, bukan uji guru awam.

## Layanan/perangkat dan operator

Belum diuji: kamera/printer/papan multitouch fisik, native QR HP lintas perangkat,
Supabase Auth/email/Realtime hosted, TLS/LAN nyata, serta review/izin pilot.
LLM contoh memakai fallback statis; tidak ada panggilan AI berbayar.
Target99%/3detik/95% tidak dinyatakan sebagai hasil pengukuran.

Hosted memerlukan project/origin HTTPS yang teridentifikasi, migration033–037
setelah backup dan review RLS, serta server env `SAMPLE_ENABLED`,
`SAMPLE_TEACHER_ID`, `SAMPLE_TEACHER_EMAIL`, `SAMPLE_TEACHER_PASSWORD`,
`SAMPLE_ACCESS_CODE`. Secret tidak memakai awalan `NEXT_PUBLIC_`. Provision satu
akun terbatas dengan `scripts/provision-sample.mjs`, kemudian operator seed:

```powershell
node scripts/seed-sample.mjs --target=<host-database-yang-benar>
```

Env operator seed: `SAMPLE_DATABASE_URL`, `SAMPLE_TEACHER_ID`, `PSQL_BIN`.
Script menolak mengambil alih controller rekaman aktif. Reset bersifat opsional,
hanya operator, sesudah backup/konfirmasi dan semua sesi serta lease berakhir:

```powershell
node scripts/reset-sample.mjs --target=<host-database-yang-benar> --confirm=<UUID-akun-contoh>
```

Reset memulihkan koleksi guru/asesmen sintetis milik akun itu; mempertahankan
kelas, UUID siswa, nama lokal, koleksi sistem dan akun lain. Tidak ada reset
otomatis atau truncate database. Command hosted di atas belum dijalankan.
