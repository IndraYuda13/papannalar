# PapanNalar

Satu aplikasi Next.js untuk Aplikasi Guru dan Layar Kelas.
Status implementasi dan task berikutnya ada di [PLAN.md](PLAN.md).
Startup, pemulihan backup uji, manifest kandidat dan batas demo final ada di
[handoff lokal](docs/09_LOCAL_HANDOFF.md).

## Demo PRELIM 7B lokal

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm demo
```

Buka `http://127.0.0.1:3100/demo`, pilih **Masuk demo lokal**, lalu ikuti petunjuk.
Papan dibuka di jendela lain pada `http://127.0.0.1:3100/layar`. Pilih **Demo
terpisah**, buat 7B (tingkat 7, 32 siswa), dan mulai Sesi Tepat Level. Pairing memakai
kode sekali pakai yang tampil di papan. Seed berisi 29 respons; pindai fixture
sintetis 07/12/25 dan simpan, lalu tampilkan Kelompok → Stasiun. Lompatan −5 dari
−3 menghasilkan −8 melalui engine dan dapat di-undo.

Launcher hanya memakai PostgreSQL uji `pn_m01c_test` pada loopback port 55432 dan
provider Auth/HTTP uji pada 54325. Windows memakai `PSQL_BIN` atau instalasi
PostgreSQL 17 standar; cluster `.local/m01c-pg` yang sudah tersedia dapat dimulai
otomatis. Jika belum ada cluster, siapkan PostgreSQL uji sesuai bagian Validasi.
Tidak mengirim email atau memakai credential Supabase live. Ctrl+C menghentikan
aplikasi/adapter dan cluster yang dimulai oleh launcher. `pnpm demo --smoke`
memeriksa startup lalu berhenti. Secret HMAC lokal dibuat sementara oleh launcher.

PDF blank tiga jenis tersedia di panel Cetak Kartu. Kamera dan foto lokal memakai
scanner piksel di browser, tanpa upload foto. Fixture sintetis diberi label jelas.
Untuk siklus lengkap, **Siapkan Paket Sesi** lalu **Mulai sesi dari paket**.
Kelas baru mendapat Cek Awal tanpa jawaban seed; lanjutkan scan/manual, kelompok,
rotasi, exit, penutupan/finalisasi dan sesi berikutnya. Siapkan paket terlebih
dahulu jika ingin menggunakan exit pada slice seed lama. Launcher harus tetap
berjalan selama demo; jangan menjalankan dua launcher bersamaan.

Paket, cek lisan, enam alat, sepuluh mode papan, rotasi/giliran, exit dan Bisik
statis tersedia. Audit13 fitur: [feature-audit.md](artifacts/qa/M15/feature-audit.md).
Konten tetap **NEEDS_REVIEW**; enam alat bukan cakupan interaktif seluruh22
langkah (K01). Live AI default nonaktif sampai review/credential/budget tersedia.
Kamera/print/fotokopi/papan fisik, hosted Auth/Realtime, live AI, pedagogi dan
consent pilot tetap **NOT_RUN/NEEDS_REVIEW**. Hasil sintetis bukan klaim target99%.

## Menjalankan lokal

Gunakan Node 24.14.1 dan pnpm 11.19.0 sesuai `.node-version` dan `packageManager`.

```sh
pnpm install --frozen-lockfile
```

Siapkan Supabase local/dev. Jika Docker berjalan, `pnpm exec supabase start`
memakai konfigurasi dan migration di `supabase/`. Salin `.env.example` ke
`.env.local`, isi URL dan publishable key lingkungan dev serta
`APP_ORIGIN=http://127.0.0.1:3000` dan `PAIRING_SECRET` acak minimal 32 karakter
khusus server. Jangan gunakan service-role key. Matikan **Allow public access**
pada pengaturan Realtime; private topic memakai policy migration.
Auth harus mengizinkan callback `http://127.0.0.1:3000/auth/callback`, email magic
link dan anonymous sign-in untuk identitas papan. Untuk dev cloud, terapkan
migration hanya pada project dev kosong setelah review; tidak ada deploy otomatis.

Jalankan `pnpm dev`, lalu buka `http://127.0.0.1:3000/masuk`. Magic link harus
dibuka di browser/perangkat yang meminta tautan (PKCE). `/guru` memerlukan sesi
guru dan menyediakan kelas/roster; `/layar` memakai identitas anonim
terpisah. `/` mengarah ke `/guru`. Data seed hanya untuk mode demo.
Server lokal terikat ke loopback. Build tidak membutuhkan credential.

Cache shell aktif pada `pnpm build` lalu `pnpm start`, bukan development server.
Buka aplikasi online dahulu agar service worker menyimpan shell/font. Setelah
cache lengkap, shell `/guru` dan `/layar` dapat dibuka ulang offline. Shell tidak
berisi data personal; akses lokal guru dikunci saat keluar dan grant lokal berlaku
maksimal delapan jam. Periksa **Kesiapan offline** sebelum kelas. Scan, koreksi,
replay, grouping, paket dan sesi tetap lokal; outbox mendukung idempotency,
konflik dua perangkat, takeover dan recovery. Nama hanya di perangkat guru dan
tidak direstore dari server. Papan menyimpan konten paket saja; reload menghapus
roster/binding dan model RAM. Tahan kontrol bawah dua detik untuk navigasi paket.
Setelah kendali lokal, guru memilih tampilan HP/papan; rencana kelompok lama
tidak diadopsi diam-diam. Pairing perlu internet
untuk provider cloud; adapter lokal secara eksplisit hanya dipakai saat demo/uji.

## Validasi

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:db:prepare
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Tes integration/browser memerlukan `psql` (atau `PSQL_BIN`) dan PostgreSQL 17
terpisah: default `postgresql://postgres@127.0.0.1:55432/pn_m01c_test`. Buat database
uji kosong tersebut sebelum `test:db:prepare`. `TEST_DATABASE_URL` hanya menerima
loopback dan nama database `pn_m01c_test`; jangan menunjuk database pengguna.
Runner memasang auth schema khusus tes dan migration asli, lalu menjalankan RLS
dengan role `authenticated`. `test:rls` dan `test:integration` memakai suite SQL yang
sama. CI menyiapkan PostgreSQL terpisah secara otomatis.

`pnpm verify` menggabungkan format, typecheck, lint, seluruh unit/content/OMR,
integration/RLS, build dan seluruh E2E setelah database uji disiapkan.
Playwright menjalankan production app pada port 3100 dan provider **khusus tes**
pada 54325. Provider mensimulasikan Supabase Auth/HTTP, tetapi query data memakai
RLS PostgreSQL nyata. Ini bukan bukti GoTrue/PostgREST atau pengiriman email live.
Docker pada lingkungan implementasi gagal start; validasi stack Supabase penuh
masih NOT_RUN. Evidence terbaru ada di `artifacts/qa/M15/` dan PLAN.
Hentikan launcher demo sebelum full verify; targeted check boleh memakai
`PAPANNALAR_REUSE_LOCAL_DEMO=1` pada build yang sama. Jangan build ulang saat
server sedang melayani pengujian. Uji instalasi kosong memakai cluster terpisah
55433, bukan menghapus database demo. Jumlah tes/coverage aktual ada di PLAN.
`pnpm test:privacy` memeriksa DTO, aturan impor dan IndexedDB nyata;
`pnpm test:offline` menguji cache dan reload.

## Struktur

- `src/app`: route, layout dan stylesheet aplikasi.
- `src/features/guru`, `src/features/layar`: komponen masing-masing surface.
- `src/ui`: token sumber, logo sementara, Button shadcn/ui dan utilitas presentasi.
- `src/contracts`: schema strict dan serializer allowlist API, auth/kelas, papan,
  referensi LLM dan diagnostik.
- `src/local`: IndexedDB data versi 10, respons/event/outbox atomik dan nama terpisah
  per akun/mode; nama optional digabung hanya di `features/guru/student-view.ts`.
- `src/offline`, `scripts/build-offline.mjs`: cache shell/aset hasil build;
  tidak menyimpan respons API, RSC atau HTML personal dari runtime.
- `src/server/auth`, `src/server/classes.ts`, `src/proxy.ts`: Supabase SSR,
  cookie guru/papan terpisah, route guru terlindungi dan adapter kelas.
- `supabase/migrations`, `supabase/tests`: tabel kelas/siswa tanpa nama, RLS,
  pembuatan roster atomik dan tes dua akun; rollback dev ada di `supabase/rollback`.
- `src/core`, `src/content`: BKT, placement/replay, grouping, scheduler, enam alat,
  22 templat dan fixture 7B versioned draft; belum direview pedagogi manusia.
- `src/cards`, `src/workers/omr`, `src/features/scanner`: layout/PDF, pembacaan
  marker/homography/QR/bubble lokal, review dan fallback manual.
- `src/server/pairing`, `src/features/classroom`: pairing, private Realtime,
  snapshot recovery, CAS, ledger command, ACK dan revocation.
- `tests/unit`, `tests/e2e`, `tests/harness`: core, privasi, IndexedDB, cache, auth,
  ownership dan regresi lintas milestone. Harness bukan aplikasi produksi.
- `tests/browser`: bundel fixture khusus Playwright, tidak dikirim sebagai aset app.

Font berasal dari paket Fontsource berlisensi OFL-1.1. Logo SVG sementara dibuat
dari deskripsi teks sumber; bukan salinan aset kanvas yang belum tersedia.
Dependency dan lisensinya tercatat di PLAN bagian 9.2.
