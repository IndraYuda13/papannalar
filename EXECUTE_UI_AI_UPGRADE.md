# Instruksi eksekusi - PapanNalar UI + AI v2

## 1. Otorisasi dan sasaran

Pengguna meminta implementasi menyeluruh di repository existing, bukan review
prompt, desain gambar saja, atau pergantian warna. Sasaran run: UI profesional
yang lebih hidup dan mudah digunakan pada SETIAP halaman, ditambah konektor AI
dua protokol tanpa mengubah hasil matematika atau merusak data.

Permintaan terbaru ini menggantikan larangan lama terhadap 3D dekoratif dan
penyedia AI tunggal HANYA dalam scope yang dijelaskan PRD baru. Enam alat belajar
kuantitatif tetap memakai representasi yang akurat. Persetujuan ini tidak membuka
akses data, menghapus review, atau mengizinkan pengeluaran biaya diam-diam.

Baca berurutan seperlunya:

- `AGENTS.md` dan jurnal terakhir `PLAN.md`, bukan seluruh sejarah tiap task.
- `docs/SOURCE_FINDINGS.md` dalam folder paket ini: lokasi baseline yang diperiksa.
- `docs/10_PRD_UI_AI_V2.md`: acceptance produk terbaru.
- `docs/11_UI_BLUEPRINT.md` saat bekerja pada tampilan.
- `docs/12_AI_COMPAT_SPEC.md` saat bekerja pada AI/database.
- `docs/13_EXECUTION_QA.md`: task queue U0-U5 dan gerbang selesai.

Bila HEAD lebih baru, sumber aktual menang untuk detail implementasi; jangan
mengembalikan perbaikan baru ke snapshot lama. Temuan baseline adalah petunjuk,
bukan temuan yang otomatis masih berlaku.

## 2. Hasil yang harus berubah nyata

UI: hierarki, tata letak, komponen, states, navigasi, editor, daftar, rekap, kendali
sesi, papan, serta bantuan harus konsisten. Tambahkan 3D yang sungguh dapat dirender,
effect gulir yang relevan, transisi ringan dan kontrol aksesibel. Bukan 3D di setiap
kotak; bukan tombol terus bergerak; bukan dashboard dengan angka fiktif.

AI: dua wire protocol eksplisit dengan model/base URL configurable. Tujuan adalah
Bisik dan penyesuaian cerita yang diizinkan, bukan chatbot siswa, AI penilai,
OCR tulisan tangan atau agent yang bebas menulis database.

Dokumen: perbarui PRD/brand/UX/tech/QA/operating rules secara tertelusur. Rencana
bisnis menghitung biaya per profil, bukan harga Haiku untuk semua provider.
Naskah concept paper tidak otomatis menyebut perubahan ini SUDAH ADA sebelum tes.

## 3. Operasi cepat tanpa kehilangan kendali

- U0 singkat: inspect git, route, scripts, komponen dan provider aktual, bukan audit
  ulang setiap hash source atau riset framework lain. Catat keadaan kerja sekarang.
- Simpan checkpoint non-destruktif. Jangan reset/clean/forcepush atau menimpa
  uncommitted work. Jangan stage secret, cache, database backup atau node_modules.
- Jalankan script pembaruan docs dry run lalu apply. Periksa diff. Marker membuat
  proses idempoten; baseline tidak ditimpa pada run berikutnya.
- Kerjakan U1-U4 bertahap tetapi terus lanjut otomatis. Targeted test setelah satu
  batch yang koheren, bukan full verify setelah satu perubahan label.
- Jangan membaca semua referensi pada setiap task. Dokumen resmi dibaca hanya
  untuk API yang sedang disentuh. Reuse dependency, fungsi, renderer dan validator.
- Implementasi visual pertama menetapkan sistem desain; lanjutkan halaman lain
  tanpa menunggu persetujuan warna atau radius. Preview screenshot internal tetap wajib.
- Jika memakai subagent, pecah UI/asset dan AI secara terpisah dengan kepemilikan
  file. Satu integrator memegang migration/schema/lockfile/shared tokens. Jangan
  dua agent menyunting navigation/provider contract yang sama bersamaan.
- Satu task yang menunggu key/review bukan alasan menghentikan semua UI atau
  contract tests. Tandai EXTERNAL_BLOCKED dan kerjakan task independen.
- Jangan mengganti requirement atau melemahkan test untuk mengejar label DONE.

## 4. Definition of done yang tidak dapat dinegosiasikan

1. Semua route inventaris mendapat walkthrough desain dan status selesai/gap;
   tidak cukup hanya halaman masuk dan beranda baru.
2. Contoh interaktif tetap mengisi form; preview/live board pakai renderer yang sama.
3. QR/reconnect/revoke, profil layar, roster lokal, hasil historis, scan/revisi dan
   BKT tidak berubah makna atau kehilangan state karena pergantian layout.
4. Asset 3D terpakai, bukan sekadar berada di folder public; poster tetap bekerja
   tanpa WebGL. Aset/data pribadi tidak dimuat dari CDN acak.
5. OpenAI Chat Completions dan Anthropic Messages keduanya lulus contract tests;
   endpoint/model dapat diganti melalui config server. Jalur lama dimigrasikan.
6. Ledger/RPC mengenali identitas profil/model baru, harga dan batas terkonfigurasi;
   tidak ada pelaporan penggunaan model baru sebagai Haiku.
7. Review konten/privasi, sample-account restriction, pembatasan biaya dan failure
   fallback tetap aktif. Konfigurasi siap berbeda dari konten layak dipanggil.
8. Tidak ada key atau payload siswa pada client, log, asset, request AI atau board.
9. Final `pnpm verify` serial selesai dengan hasil aktual. Bila ada gagal lalu
   diperbaiki, jalankan gerbang akhir lagi pada HEAD yang sudah berubah. 'Sekali'
   berarti menghindari pengulangan boros, bukan izin menerima suite gagal.

## 5. Hal yang tidak dikerjakan

Bukan migrasi framework, bukan rewrite semua domain, bukan cloud rendering,
bukan editor Canva, bukan microservice, bukan sistem billing, bukan marketplace
BYOK multi-tenant, bukan pemasangan arbitrary tools/web browsing pada AI. Tidak
menambah dark mode penuh sebagai syarat. Tidak mengubah scan piksel menjadi vision
LLM. Tidak membuka student chatbot. Tidak menaruh API key dalam QR atau localStorage.

## 6. Penutupan

Simpan evidence ringkas di `artifacts/qa/ui-ai-v2/`: route matrix, screenshot sebelum
sesudah, command dan exit, provider fixture matrix, ledger migration test, asset
budget, build/commit dan gap nyata. Screenshot hanya data sintetis.

Buat `UI_AI_HANDOFF.md`: cara start, konfigurasi protokol tanpa key, fitur yang
berfungsi, jalur uji aman, diagnosis konfigurasi/review/budget, rollback, dan apa
yang belum dicoba live. Update PLAN tanpa ribuan baris narasi per task.

Laporan akhir pengguna: perubahan nyata, total route yang dicek, model/protokol
fixture versus live, hasil verify, NOT_RUN dan kebutuhan operator. Jangan klaim
'100% kompatibel semua AI', 'bebas bug', 'sudah diuji guru' atau 'production-ready'
berdasarkan fixture/screenshot saja.
