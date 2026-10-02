# PapanNalar - Video-Ready Product Pass

Status dokumen: instruksi implementasi baru, BUKAN laporan fitur sudah dikerjakan.
Disusun 30 September 2026 untuk persiapan rekaman pengguna berikutnya.
Target: satu instruksi, eksekusi berlanjut antar-batch sampai alur wajib terhubung,
bukan kembali ke review M00-M17. Tidak ada janji durasi atau kelulusan tanpa bukti.

## 0. Misi, otoritas, dan cara kerja cepat

Kamu adalah implementer sekaligus penguji PapanNalar EXISTING. Pengguna akan
merekam video aplikasi dan membutuhkan produk yang mudah dipakai guru/murid,
bukan tampilan test harness. Kerjakan perubahan di bawah sampai benar-benar
terhubung: UI, state, penyimpanan, API/otorisasi, dan alur browser.

Baca `AGENTS.md`, bagian status TERBARU `PLAN.md`, area kode yang akan disentuh,
dan bagian relevan `docs/08_TECH_SPEC.md`. Audit lama, jika ada di repo, merupakan
petunjuk lokasi masalah, bukan alasan mengaudit ulang seluruh repository.

Instruksi pengguna terbaru dalam dokumen ini mengubah scope lama secara eksplisit:
- Tambahkan pustaka kumpulan soal milik guru yang bisa dipakai lintas kelas.
- Tambahkan pengelolaan presentasi, asesmen/tes, dan hasil tersimpan.
- Tombol data contoh masuk ke aplikasi utama dengan dataset sintetis persisten,
  BUKAN ruang demo baru per pengunjung dan BUKAN redirect ke `/demo`.
- Ukuran komponen/angka/font menjadi responsif dan dipilih lewat preset layar;
  angka ukuran lama bukan ukuran wajib untuk setiap elemen dekoratif.
- Profil layar digunakan kembali, QR pairing/reconnect tersedia, dan beranda
  tidak lagi menumpuk semua workspace.

Instruksi ini mengungguli batas scope/UX lama yang bertentangan secara spesifik.
Jangan mengubah delapan dokumen sumber asli; catat delta ringkas di PLAN.md.
Aturan lama 'kerjakan satu task lalu berhenti' TIDAK berlaku untuk run ini.
Keselamatan data, auth/RLS, larangan klaim palsu, serta ketepatan math tetap berlaku.

CARA KERJA:
1. Lakukan pemeriksaan TERARAH: git status, manifest/scripts, entry point UI/auth,
   dan kontrak yang perlu diubah. Jangan audit ulang hash/rubrik/dependency penuh.
2. Tetapkan checklist V1-V6 di bawah pada PLAN.md, lalu langsung coding.
3. Kerjakan perubahan sebagai potongan alur vertikal yang kecil tetapi lengkap.
4. Jalankan targeted regression pada area yang berubah. Setelah hijau, lanjut
   otomatis; jangan menunggu balasan pengguna di antara batch.
5. Simpan checkpoint runnable dan ringkasan bukti singkat setelah setiap batch.
6. Jalankan full `pnpm verify` sekali pada kandidat akhir. Periksa isi script:
   jangan menjalankan ulang install/build/full E2E yang sudah dicakup verify.
7. Jika satu layanan eksternal tidak tersedia, catat kebutuhan tepatnya SATU KALI,
   lanjut pekerjaan independen. Jangan mengejar setup Docker berulang kali.
8. Hanya berhenti karena blocker integritas/keamanan yang tidak punya jalur aman,
   batas lingkungan yang nyata, atau semua acceptance inti telah diuji.

Tidak perlu ganti model, framework, package manager, versi baseline, atau merombak
core. Jangan mengejar coverage 100%, membuat benchmark 11.000 soal berulang,
menulis laporan panjang per-task, atau membangun page builder generik.
Jika ada subagent, maksimal bagi UI, koneksi, dan konten setelah kontrak disepakati;
satu integrator memegang schema/migration/lockfile, jangan mengedit file sama paralel.

## 1. Urutan delivery - semua inti dikerjakan dalam run yang sama

| Batch | Hasil yang harus nyata | Prioritas |
| --- | --- | --- |
| V1 | Navigasi guru terpisah, layout papan pas, microcopy bersih, data contoh aplikasi utama | Kritis untuk rekaman |
| V2 | Profil layar tersimpan, preset visual, tes sentuh auto-next, QR connect dan reconnect aman | Kritis untuk dua perangkat |
| V3 | Kumpulan soal sistem/guru, editor dua jenis, preview, reusable lintas kelas | Fitur inti baru |
| V4 | Sesi mengajar/asesmen memakai set terpilih, kartu dan scan terikat benar, hasil ke database | Fitur inti baru |
| V5 | Tutup gap audit yang memengaruhi alur video: mapping alat, alasan, tugas mandiri, offline chooser | Kualitas inti |
| V6 | Uji alur normal dua perangkat + cek viewport; satu full verification dan handoff | Gate video-ready |

Urutan boleh disesuaikan agar dependency data V3 tersedia untuk V1, tetapi jangan
mendahulukan fitur tambahan. V1/V2 yang runnable harus tetap dipertahankan sebagai
checkpoint sambil melanjutkan V3/V4. Jangan berhenti setelah UI terlihat bagus.

Di luar run: billing, LMS lengkap, laporan dinas, OCR tulisan tangan, live drawing
antarperangkat, generator AI baru, marketplace soal, editor bebas mirip Canva,
dan empat manipulatif baru di luar enam alat existing. Tidak ada leaderboard siswa.

## 2. V1 - Navigasi dan aplikasi utama yang benar-benar dapat dipakai

### 2.1 Struktur navigasi guru

Ubah beranda panjang menjadi halaman yang mempunyai satu pekerjaan jelas.
Nama berikut adalah kontrak UX; route boleh menyesuaikan pola existing tanpa duplikasi.

| Menu | Isi utama | Aksi utama |
| --- | --- | --- |
| Beranda | Lanjutkan sesi aktif; kelas terakhir; status layar yang ringkas | Mulai mengajar |
| Kelas | Daftar kelas; detail roster; nama lokal/absen; target dan cara cek | Tambah kelas |
| Soal & Presentasi | Tab Dari Sistem / Soal Saya; kumpulan soal; preview/editor | Buat kumpulan soal |
| Asesmen & Hasil | Tab Sesi Asesmen / Hasil; filter kelas, tanggal, kumpulan | Buat asesmen |

Contoh route: `/guru`, `/guru/kelas`, `/guru/kelas/[id]`, `/guru/soal`,
`/guru/soal/[id]`, `/guru/asesmen`, `/guru/hasil/[id]`.
`/layar` tetap jalur papan. Kendali sesi menjadi halaman tersendiri, bukan kartu
raksasa tertanam di beranda. Pengaturan layar dapat diakses dari status Sambungkan
Layar atau menu pengaturan, bukan menjadi menu utama kelima yang penuh debug.

Desktop: sidebar yang ringkas. HP: empat destinasi utama yang jelas, maksimal
empat item bottom navigation; layar editor/sesi boleh memakai header kembali.
Jangan menampilkan semua tombol lanjut, impor, kamera, tes, sync, dan paket bersamaan.

Reuse workspace/domain yang sudah ada. Pindahkan dan komposisikan, jangan copy-paste
komponen raksasa ke setiap route. Pertahankan pilihan kelas, kumpulan soal, dan
sesi pada navigasi kembali; jangan reset form saat membuka preview.

### 2.2 Kelas dan identitas murid

Di detail kelas: nomor absen, nama panggilan opsional, status hadir, edit/tambah/
arsip siswa, impor/ekspor CSV lokal, serta target/cara cek di pengaturan sekunder.
Validasi absen unik dan aturan jumlah 1-40. UUID siswa stabil: mengganti nama atau
nomor absen tidak membuat siswa baru dan tidak memindahkan hasil lama ke siswa lain.
Simpan roster snapshot/absen saat asesmen. Arsip lebih aman daripada menghapus
riwayat. Jangan menghapus assessment history ketika siswa diarsipkan.

Nama murid nyata tetap LOCAL-ONLY, digabung di boundary tampilan guru. Database
menyimpan ID acak, absen dan hasil; bukan nama nyata. Pada perangkat tanpa pemetaan
nama, tampilkan Absen 07 dengan opsi impor nama lokal, bukan nama murid yang salah.
Nama dalam fixture video harus jelas fiktif dan diinisialisasi lokal pada perangkat
guru yang memakai akun contoh. Jangan mengirim nama itu lewat board/network DTO.

### 2.3 Data contoh persisten di aplikasi production - bukan ruang demo terpisah

Pengguna secara eksplisit meminta tombol **Coba dengan data contoh** membuka
halaman aplikasi utama tanpa registrasi. Implementasikan hal tersebut:

- Satu akun guru CONTOH/REKAMAN yang diprovision sekali, bukan akun/tenant baru
  setiap visitor. Dataset persisten di database lingkungan aplikasi yang dipakai
  rekaman; memakai route `/guru/...`, API, editor, penyimpanan, dan engine normal.
- Navigasi, operasi kelas, pemilihan soal, scan, pairing dan hasil menggunakan
  jalur produk yang sama, bukan preview read-only atau hardcoded state UI.
- No redirect ke `/demo`; no kata 'ruang demo terisolasi per pengunjung'.
- Identitas sesi browser tetap diperlukan untuk otorisasi; 'tanpa daftar' bukan
  'semua orang menjadi admin'. Setelah menekan tombol, server membuat session
  akun contoh melalui mekanisme auth yang sah. Jangan aktifkan test provider
  atau `__test/link` di production, jangan bypass `requireTeacher`/RLS.
- Reuse Auth existing. Credentials akun contoh hanya server env/secret store;
  runtime request normal memakai session akun terbatas, bukan service/admin key.
- Akses rekaman dapat diaktifkan lewat flag server, dibatasi rate limit, dan
  tersedia untuk operator lewat tautan undangan rekaman singkat sekali pakai
  atau access code. Itu tidak membutuhkan registrasi. Jika deployment sudah
  membatasi akses operator, tidak perlu login manual tambahan.
- Tautan akses dibersihkan setelah ditukar menjadi cookie; jangan isi QR papan
  dengan login credential. Status contoh cukup satu badge kecil 'Data contoh'
  di HP; tidak perlu banner teknis besar atau overlay pada seluruh papan.
- Akun contoh tidak dapat mengakses data guru nyata, admin, billing, atau mengirim
  email. Disable panggilan AI berbayar pada akun contoh kecuali diotorisasi.
- Seluruh operator contoh mengakses DATASET SAMA. Jangan membuat duplikasi baru
  setiap kunjungan. Lindungi sesi rekaman aktif dari visitor lain: satu controller
  aktif, takeover eksplisit yang sah, dan akses operator saat rekaman.
- Jangan mengganti sesi pengguna nyata yang sedang login secara diam-diam.

SEED MINIMUM:
- Kelas 7B (32 siswa) dan satu kelas lain, misalnya 7C, untuk membuktikan reuse.
- Data nama fiktif lokal, tanpa siswa sungguhan.
- Kumpulan sistem interaktif bilangan bulat/pecahan yang sudah didukung engine.
- Kumpulan guru 5 soal pilihan ganda lengkap dan satu kumpulan interaktif pendek.
- Minimal dua sesi hasil historis contoh dengan kelas/tanggal berbeda, ditandai
  provenance sintetis; jangan mengklaim itu hasil pilot sungguhan.
- Satu asesmen kosong yang dapat diisi melalui scan/input saat rekaman.

Buat seed IDEMPOTEN berbasis namespace/ID dataset contoh. Klik login tidak mereset
hasil. Reset hanya oleh operator, dengan konfirmasi, hanya dataset milik akun
contoh, dan tidak berjalan ketika sesi aktif. Jangan reset/truncate database.

Permintaan ini mengizinkan penambahan data sintetis rekaman, bukan penghapusan
production atau pembukaan akses umum ke data lain. Gunakan target project yang
teridentifikasi jelas dari env. Jika DB/secret belum tersedia, siapkan implementasi,
migration dan command seed; laporkan tepat apa yang belum dijalankan. Jangan
mengatakan data sudah masuk production bila baru adapter lokal yang diuji.

Pisahkan kelayakan data dari URL halaman: data sintetis boleh menjalankan route
normal dengan provenance sintetis; kelas nyata tetap mengikuti review/consent.
Jangan mengubah semua `draft` menjadi `approved`. UI guru normal tidak menawarkan
switch developer 'pilot/demo'; eligibility diputuskan backend dari konteks tepercaya.

### 2.4 Ukuran papan, tombol, lingkaran dan teks

Pertahankan palet/token PapanNalar, Plus Jakarta Sans untuk guru dan Atkinson
Hyperlegible untuk papan; jangan rebranding atau mengganti dengan dashboard generik.
Perbaiki layout, BUKAN sekadar memberi `transform: scale(0.7)` seluruh halaman.
Gunakan viewport kerja dengan header kecil, area soal/model fleksibel, dan kontrol
ringkas. Tetapkan ukuran berdasar viewport efektif dan preset, bukan hardcode
1920x1080 untuk semua device.

- Area kelas utama tidak scroll vertikal untuk melihat soal/model/tombol yang
  sedang dipakai. Gunakan grid/flex `min-height:0`/`min-width:0`, batas region,
  safe-area dan dynamic viewport unit bila tepat. Jangan potong konten dengan
  overflow hidden sebagai cara menutupi bug.
- Soal panjang dipecah menjadi langkah/halaman; jangan mengecilkan sampai tidak
  terbaca. Panel guru/detail boleh scroll, papan pembelajaran utama tidak.
- Kurangi header, whitespace, border, label dan kontrol developer yang tidak
  perlu. Kontrol guru pindah ke HP atau panel guru sekunder.
- Lingkaran pada soal lift/garis bilangan: pisahkan visual titik/marker dari
  hit-area. Contoh awal marker 32-48 CSS px sesuai preset, hit-area sekurang-
  kurangnya 48 CSS px dan lebih lapang bila papan memungkinkan. Jangan memberi
  setiap label lantai ukuran tombol aksi. Hindari target transparan bertumpuk;
  jika target berdekatan, pakai satu rail drag dengan snapping.
- Tombol jawaban berupa baris/kartu proporsional dengan badge A/B/C/D kecil;
  jangan membuat satu lingkaran raksasa untuk satu huruf.
- Teacher UI: body sekitar 16px, heading sekitar 20-28px, target minimal 48px
  atau lebih sesuai kebutuhan aksesibilitas; bukan menyalin ukuran papan ke HP.
- Board mengutamakan keterbacaan dari belakang kelas. Preset harus mengubah
  hierarchy font/model/gap secara konsisten. Ukuran visual lebih kecil tidak
  boleh menghilangkan area sentuh, keyboard focus, kontras, atau label aksesibel.
- Pecahan bertumpuk, tanda minus matematika dan format angka Indonesia tetap
  konsisten. Jangan memakai browser zoom sebagai satu-satunya solusi produk.

Viewport wajib: guru 360x800, 390x844 dan 1366x768; papan 1280x720, 1366x768,
1920x1080. Periksa juga resize/fullscreen dan font guru diperbesar 130%.

### 2.5 Microcopy dan instruksi soal

Hapus dari UI harian: 'DTO', 'BKT', 'payload', 'channel epoch', 'seed', 'hash',
'draft schema', 'adapter', instruksi setup server, log teknis, switch developer.
Pindahkan ke log/devtools/detail operator; jangan menghapus bukti backend.
Pertahankan status yang benar-benar berguna: Tersimpan, Belum tersinkron, Data
contoh, Perlu dicek, Sedang menyambungkan. Pesan error memberi satu langkah lanjut.

Setiap soal punya satu instruksi tindakan yang spesifik dan sesuai jenis:
- Lift: 'Geser penanda ke lantai tujuan, lalu ketuk Jalankan.'
- Tebakan tertulis: 'Tulis tebakan di buku. Pilot menaruh penanda di layar.'
- Batang pecahan: 'Bagi batang, lalu warnai bagian yang diminta.'
- Pilihan ganda kertas: 'Hitamkan satu jawaban di Kartu Nalar, baris 3.'
- Menulis di papan: 'Tulis caramu di area kosong. Guru membahasnya bersama.'
- Mandiri: 'Kerjakan di buku bersama pasanganmu.'

Kalimat harus mengikuti kontrol yang benar-benar ada. Jangan menyuruh klik bila
siswa menjawab di kertas. Jangan menampilkan instruksi seret pada device tanpa
sentuhan tanpa menyebut guru yang mengendalikan. Satu tujuan, satu instruksi,
satu aksi utama per konteks. Tombol 'Cari Kesalahan' tetap nama pola belajar yang
sah; hindari feedback menghakimi siswa, bukan melarang semua substring 'salah'.

## 3. V2 - Profil layar, kalibrasi dan hubungan HP-papan

### 3.1 Perangkat layar dan preset visual

`/layar` bisa dibuka langsung di browser papan interaktif ATAU di laptop yang
terhubung HDMI ke papan/TV/proyektor. HDMI memberi gambar; jangan menganggap HDMI
sendiri otomatis menyediakan input sentuh. Mode mouse/remote HP harus tetap jalan.

Implementasi sudah mempunyai penyimpanan profil kemampuan (`capability-storage.ts`).
Periksa sebab profil tidak dipakai kembali: perubahan origin, parse schema,
clear storage, startup state, atau tes ditutup sebelum tersimpan. Extend jalur
existing, jangan menulis ulang subsistem kemampuan dari nol.

Pisahkan:
- `capabilities`: kemampuan nyata touch, multitouch, pointer, storage, dst.
- `appearance`: preset ukuran, kepadatan dan posisi zona interaksi.
- session pairing/auth: token singkat; BUKAN bagian profil preferensi permanen.

First use:
1. Nama layar opsional, misalnya 'Papan 7B'. Tidak mengharuskan registrasi layar.
2. Preview tiga preset: Ringkas, Seimbang (default), Besar.
3. Gunakan dua/tiga SOAL CONTOH YANG SAMA untuk membandingkan preset: lift, pecahan,
   pilihan ganda. Guru menekan pilihan dan melihat hasilnya pada viewport nyata,
   lalu Simpan. Bukan form slider puluhan angka.
4. Jalankan cek kemampuan yang diperlukan; jelaskan jalur tanpa sentuhan.
5. Simpan profile/schemaVersion/displayKey/settings di browser layar. Bila server
   menyimpan metadata, allowlist saja; tidak menyimpan siswa/token pairing.

Kunjungan berikutnya memakai profil tersimpan tanpa wizard berulang. Perubahan
resolusi/fullscreen menyesuaikan layout, bukan menghapus profil atau memaksa tes.
Berikan 'Ubah tampilan' dan 'Tes ulang' di menu sekunder. Migrasikan profil lama
ke default appearance aman. Gagal upload metadata ke server tidak membatalkan
profil lokal. Storage ditolak -> berlaku sepanjang tab, pesan ringkas sekali.

Profil berlaku pada browser/origin/display setting itu, bukan menjanjikan deteksi
identitas monitor fisik universal. Jika laptop pindah monitor, sediakan ganti
profil/preset, bukan fingerprinting perangkat atau permission tambahan wajib.

### 3.2 Tes kemampuan auto-next, terlihat dan tidak menipu

- Target, status hasil, dan progres tahap terlihat tanpa scroll/tertutup header.
- Tahap 1/2/3 sesuai sentuhan aktual: satu, dua, dan empat pointer bersamaan.
- Ketika syarat tercapai, tunjukkan checkmark + pesan singkat selama sekitar
  600-900ms (parameter UI, bukan janji kinerja), lalu lanjut otomatis satu tahap.
- Tunggu pointer dilepas atau lakukan debounce agar jari yang sama tidak
  menyelesaikan tahap berikutnya tanpa sengaja. Bersihkan pointer cancel/lost.
- Ukur yang benar-benar terdeteksi. Klik mouse tidak boleh meluluskan multitouch.
- Untuk HDMI/mouse/remote: 'Gunakan tanpa sentuhan', skip tahap yang tidak tersedia
  dan simpan fallback secara jujur. Jangan membuat pengguna terjebak 'Belum terdeteksi'.
- Cek browser otomatis; bahasa pengguna 'Layar siap' atau langkah pemulihan,
  rincian Pointer Events/IndexedDB disembunyikan di detail teknis.
- Pop-up/toast tidak memerlukan OK berulang, tidak menutupi target, dan tidak
  menggunakan warna saja untuk menunjukkan status. Setelah selesai, kembali ke QR.

### 3.3 Sambungkan lewat QR, tetap punya kode manual

Di idle `/layar`: QR besar secukupnya, kode enam digit, satu instruksi.
Di HP: 'Sambungkan Layar' -> Pindai QR atau Masukkan Kode.
Kamera QR native HP yang membuka link aplikasi harus didukung; scanner in-app
reuse decoder yang ada dengan fallback izin kamera dan input kode.

QR membawa URL origin aplikasi yang benar dan challenge pairing singkat, bukan
access token guru, password, student ID, roster atau service key. Challenge
kedaluwarsa dan pemakaian ulang ditolak; QR kedaluwarsa bisa diganti otomatis saat
online. Login/session yang sah dan pemeriksaan kepemilikan tetap diperlukan
sebelum kontrol sesi diberikan. Jangan fetch/navigasi URL arbitrary hasil scan.

Setelah scan QR -> session/class yang dipilih tetap ada -> layar menampilkan
materi yang sama -> HP memberi 'Layar tersambung'. Tidak perlu membuat kelas,
sesi, atau paket lagi. QR baru bukan berarti sesi belajar baru.

### 3.4 Putus jaringan berbeda dari mengakhiri sesi

Implementasikan status terpisah untuk:
- transport HP -> server;
- transport papan -> server;
- kehadiran/lease controller;
- sesi masih aktif atau sudah ditutup/revoked.

Jangan menganggap 'snapshot berhasil diambil papan' berarti HP masih terhubung.
Gunakan presence/heartbeat atau mekanisme lease existing yang setara. Presence
bukan sumber kebenaran tunggal; state/revision sesi tetap persisten. Callback
leave sementara ketika rekonsiliasi tidak langsung membuang sesi. Gunakan masa
jeda configurable dan uji fake-clock; jangan menjanjikan deteksi instan ketika
browser HP sedang dibekukan OS.

Saat jaringan HP hilang:
- HP menampilkan status ringkas 'Koneksi terputus. Menyambungkan kembali...'.
- Papan MENAHAN soal/progres terakhir, tidak kembali ke halaman awal atau
  wizard kalibrasi. Tidak ada banner error teknis yang mengganggu siswa.
- Bila controller memang tidak tersedia, papan boleh menampilkan tombol kecil
  'Sambungkan kembali' untuk membuka QR, bukan memaksa modal memenuhi soal.
- Auto-reconnect memakai session/presentation ID, revision dan channelEpoch
  existing. Backoff secukupnya; jangan membuat timer/subscription ganda.
- Scan QR ulang -> binding ulang controller sah ke sesi aktif YANG SAMA ->
  pull snapshot terbaru -> lanjut, tanpa mengulang soal atau penilaian.
- Jika ada controller baru mengambil alih dengan sah, token/lease lama tidak
  boleh mengirim perintah. Perintah ganda/out-of-order ditolak/idempoten.
- Waktu/putaran tidak reset; gunakan state timer existing, bukan timer dimount ulang.
- Untuk papan disentuh saat HP offline, gunakan aturan otoritas/revision existing
  agar state HP yang basi tidak menimpa state papan yang lebih baru saat kembali.

Bedakan tombol 'Putuskan layar', 'Keluar akun', dan 'Akhiri sesi'. Putus eksplisit
mengakhiri grant kontrol; jangan auto-reconnect credential yang sudah dicabut.
Sesi yang sudah ditutup tidak hidup lagi karena QR lama. Progres tersimpan tetap
bisa dibuka sebagai riwayat atau dilanjutkan melalui tindakan sah sesuai status.

Network loss tidak menghapus ink RAM selama halaman papan tetap hidup. Reload
papan tidak menjanjikan pemulihan tulisan bebas, karena ink tidak boleh disimpan.
Untuk jawaban/hasil/progres domain, reload harus pulih dari storage/state yang sah.

Jangan membangun server WebSocket/LAN baru. Jangan mengklaim HP-papan sinkron saat
keduanya offline hanya karena tersambung hotspot. Pertahankan mode lokal/fallback.

## 4. V3 - Kumpulan soal guru, sistem, dan presentasi reusable

Ini fitur authoring baru yang disetujui pengguna. Buat versi minimum yang utuh,
bukan editor kosong. Gunakan kontrak berbasis jenis, bukan string UI bebas.

### 4.1 Kepemilikan dan versi

Pisahkan entity:
- Kumpulan soal: ID, owner guru, judul, sumber sistem/guru, jenis, status draft/siap.
- Versi kumpulan: daftar soal terurut dan metadata immutable setelah dipakai sesi.
- Soal: ID stabil, prompt, instruksi, jenis dan konfigurasi tervalidasi.
- Penugasan/sesi: classId + versi kumpulan + tanggal + mode mengajar/asesmen.
- Respons/hasil: assessment/session ID + student UUID + item/form binding + revisi.

Kumpulan TIDAK memiliki classId sebagai syarat kepemilikan. Kelas dipilih saat
'Gunakan di kelas' / 'Mulai mengajar' / 'Buat asesmen'. Satu versi dapat dipakai
7B dan 7C tanpa menyalin isi. Hasil masing-masing kelas/sesi tidak bercampur.

Edit setelah dipakai membuat versi berikutnya; hasil lama tetap terikat versi
lama. Arsip set yang dipakai jangan menghapus jawaban. Ganti urutan saat masih
draft diperbolehkan; setelah sesi berjalan urutan/kunci/binding dibekukan.

Tambahkan migration minimum, owner RLS, API/DTO strict serta repository client
secukupnya. Reuse versi, sync, dan schema existing, hindari storage paralel yang
menduplikasi authoritative state. Published system catalog bersifat read-only;
guru dapat salin sebagai set miliknya untuk mengedit.

### 4.2 Flow editor

Soal & Presentasi -> Buat kumpulan soal:
1. Isi nama kumpulan, misalnya 'Bilangan Bulat - Pertemuan 1'.
2. Pilih jenis: **Interaktif di layar** atau **Soal dengan Kartu Nalar**.
3. Tambah soal, atur urutan, preview, simpan.
4. Gunakan di kelas sekarang atau simpan untuk nanti.

Kedua jenis harus berfungsi. Jenis konsisten per kumpulan pada versi pertama
agar sederhana; mixed deck tidak wajib untuk rekaman. Jangan membuat pilihan
jenis lalu semua soal diproses sebagai pilihan ganda saja.

### 4.3 Jenis interaktif

Tiap soal mempunyai pilihan aktivitas dari registry engine yang sudah tersedia:
- Garis Bilangan/Lift: titik awal, target/operasi dan aturan snapping.
- Batang Pecahan: utuh/bagian/operasi yang didukung adapter.
- Tabel Rasio, Ubin Aljabar, Timbangan Persamaan, Grafik Geser: pakai konfigurasi
  existing yang valid. Jenis yang tidak supported tidak boleh terlihat selectable.
- **Menulis di papan**: prompt + zona tulis kosong + hapus/undo. Tulisan hanya RAM,
  tidak OCR, tidak auto-grade, tidak disimpan/ditransmisikan sebagai gambar.

Editor berisi field bernama jelas sesuai jenis, bukan textarea JSON untuk guru.
Parameter dicek solver sebelum publish/siap. Preview menggunakan komponen produksi
yang sama dengan `/layar`, bukan gambar/stub. Tidak perlu arbitrary drag-and-drop
builder; drag didefinisikan melalui template numerasi yang sudah ada.

Alat interaktif bukan otomatis bukti penguasaan individual. Tanpa observasi
permurid yang valid, jangan masukkan hasil Pilot atau tulisan papan ke BKT.

### 4.4 Jenis Soal dengan Kartu Nalar

Guru mengisi prompt, opsi A/B/C/D, satu kunci yang benar, serta penjelasan opsional.
Aplikasi menambahkan pilihan '?' / Belum tahu; '?' bukan kunci jawaban benar.
Validasi empat opsi terisi/tidak duplikat dan satu kunci. Field kesalahan tampil
di dekat field, draft tersimpan; jangan hilangkan isi editor saat validasi gagal.

Layar siswa menampilkan prompt, pilihan dan instruksi baris kartu. Kunci dan
penjelasan guru tidak masuk public board DTO/HTML tersembunyi. Guru melihat kunci
di HP; pembahasan di papan hanya lewat aksi guru setelah asesmen berakhir.

Untuk konten dari sistem, simpan referensi versi/parameter materialized, bukan
memanggil random generator lagi saat refresh. Soal guru boleh diverifikasi guru
untuk dipakai; jangan memberi label telah direview pedagogi independen.

PENTING: asesmen pilihan ganda buatan guru TIDAK otomatis menjadi Cek Awal/Cek
Mingguan adaptif. Default: simpan hasil asesmen saja. Hanya observasi dengan
mapping StepId, tipe respons, kunci, alasan dan kelayakan konten yang tervalidasi
boleh memperbarui BKT. Pilihan StepId manual saja belum cukup untuk mengklaim
model kalibrasi/pedagogi. Jangan merusak hasil Tangga Nalar dengan soal arbitrer.

## 5. V4 - Jalur mengajar, asesmen, scan dan hasil tersimpan

### 5.1 Pilihan mulai mengajar

Dari kelas 7B atau Beranda:
Pilih kelas -> Pilih kumpulan (Dari Sistem / Soal Saya) -> Preview singkat ->
Sambungkan layar jika belum -> Mulai.

Pada kelas/kumpulan yang sudah dipilih, hindari meminta input berulang. Sesi aktif
memunculkan 'Lanjutkan sesi', bukan tombol yang membuat duplikat. Semua panel tahu
kelas aktif, nama kumpulan, dan soal keberapa. Tombol Sebelumnya/Lanjut/selesai
jelas; keluar sesi memberi pilihan Simpan & keluar, bukan kehilangan progres.

Sesi interaktif dapat memakai rutinitas Sesi Tepat Level existing. Jangan
memaksa setiap presentasi guru menjadi sesi diagnostik/adaptif tujuh fase.
Bedakan mode presentasi sederhana dan mode adaptif pada konfigurasi yang relevan.

### 5.2 Asesmen/tes menggunakan kertas

Asesmen & Hasil -> Buat asesmen -> kelas -> kumpulan -> tanggal -> pratinjau
lembar jawab -> simpan/mulai. Saat berjalan: soal di papan, siswa menjawab di
Kartu Nalar, guru memindai. Pindai juga bisa dilakukan setelah kelas.

Nama menu guru boleh 'Asesmen & Hasil' dengan deskripsi 'Kelola tes dan rekap'.
Bahasa siswa tetap tenang 'Cek pemahaman', tanpa ranking/skor publik. Ini perluasan
asesmen yang diminta pengguna, bukan integrasi rapor resmi.

### 5.3 Binding lembar jawaban adalah persyaratan inti

Sebelum scan, pilih kelas, tanggal/sesi, kumpulan dan versi. Tampilkan ringkasan
singkat, lalu nomor absen dan baris. Server memeriksa ownership kelas/set/sesi.

Reuse geometry/OMR/cetak existing; jangan desain reader baru. Untuk soal custom:
- Pisahkan intent `custom_assessment` dari `initial/weekly/exit`.
- Mapping row -> itemId -> versi kunci dibekukan saat lembar diterbitkan.
- Kartu 5/10 baris boleh reuse layout; jika lebih dari kapasitas, pecah ke
  beberapa lembar dengan pageIndex/formVersion yang dibaca QR, atau berikan
  batas yang eksplisit sebelum mulai. Jangan truncate/menyembunyikan soal.
- QR berisi metadata form/versi/halaman yang opaque, bukan nama/identitas anak.
- Kartu dari sesi/versi/halaman lain ditolak atau perlu konfirmasi binding yang
  aman; jangan dinilai diam-diam dengan kunci sesi yang kebetulan aktif.
- Layout/kind baru wajib diuji dengan scanner dan PDF, bukan hanya ganti label.
- Kartu lama Cek Awal/Mingguan/Keluar tetap kompatibel; jangan tafsirkan ulang
  kartu keluar dua tingkat sebagai soal custom biasa.

Scan membaca piksel LOKAL. Foto/raw image tidak masuk DB/LLM. Satu scan sama tidak
menambah siswa/hasil. Koreksi menjadi revisi, bukan bukti tambahan. Respons kosong
pada baris terbaca = '?'; siswa belum mengumpulkan tetap 'Belum masuk'.

### 5.4 Database hasil dan UI rekap

Simpan hasil respons/penilaian per sesi di database dengan owner RLS. Local cache
atau state React saja tidak memenuhi permintaan ini. Jika offline, queue metadata
jawaban aman lalu sync idempoten; bedakan 'Tersimpan di perangkat' dan
'Tersimpan di database'. Server validasi/menghitung ulang skor dari versi kunci
tepercaya; jangan percaya total benar kiriman browser tanpa verifikasi.

Tampilan hasil:
- Filter kelas, rentang tanggal, kumpulan soal.
- Baris siswa: absen, nama lokal jika tersedia, status Belum masuk/Perlu dicek/
  Sudah masuk, jumlah benar/total, rincian jawaban.
- Drill-down satu siswa menunjukkan item, jawaban, kunci untuk guru dan revisi.
- Urut default absen, bukan ranking. Ada ringkasan jumlah lembar masuk.
- Pilihan tanggal memakai timezone Asia/Jakarta untuk UI/filter kalender;
  timestamp tetap tersimpan standar. Pastikan hasil sekitar pergantian hari
  tidak berpindah tanggal karena konversi UTC yang salah.
- Rename kumpulan/siswa atau pindah absen tidak mengubah makna hasil historis.
- Ekspor CSV bila diperlukan video memakai nama lokal di browser; lindungi CSV
  formula injection dan jangan membangun export server yang memuat nama nyata.

Dua akun guru, board anon, dan visitor tanpa sesi harus tetap tidak dapat membaca
hasil kelas lain. Data contoh menggunakan pipeline hasil yang sama, diberi
provenance sintetis. Jangan menulis 'hasil belajar meningkat' dari seed contoh.

## 6. V5 - Gabungkan corrective pass yang memengaruhi pengalaman inti

Cocokkan dengan HEAD aktual; bila sudah diperbaiki, jangan kerjakan ulang.
- Perbaiki pemetaan C2/A4 dan status supported berdasarkan instance soal, bukan
  nama alat. Pilih materi didukung untuk rekaman, tanpa memalsukan dukungan lain.
- Alasan kartu keluar versi papan <=8 kata dan jelas; penjelasan guru terpisah.
  Jangan memotong kalimat otomatis sehingga arti/kunci berubah.
- Set mandiri Sesi Tepat Level harus berisi konteks, Cari Kesalahan, latihan,
  dan tantangan terbuka. Gunakan angka/solver existing.
- Refleksi menampilkan kegunaan dari kelompok/materi yang benar-benar dipakai.
- Offline chooser dapat memilih dua kelas/paket yang sudah tersimpan, bukan
  hanya membuka last-session global. Namespace owner/provenance tetap dijaga.
- Auto-capture scanner bila siap di library existing: frame stabil, semua marker,
  rate limit, cooldown dan pause saat review. Manual foto/input lokal tetap
  pilihan yang bekerja; jangan mengklaim auto bila masih harus tekan per kartu.
- Polling snapshot bukan indikator peer online. Hindari polling full state setiap
  detik saat realtime sehat; gunakan recovery/backoff dan tetap uji revoke/ACK.
- Fairness satu Pilot jangan menghambat perbaikan jalur video, tetapi jangan
  menghapus ledger atau memalsukan capaian target untuk menandai audit selesai.

## 7. Kontrak teknis minimum dan risiko yang tidak boleh disingkat

REUSE, bukan rebuild:
- Pertahankan BKT, grouping dari displayed placement, hysteresis, exact math,
  observation IDs, revisi/replay dan frozen exit binding.
- Pertahankan teacher-vs-board auth dan RLS semua tabel baru/lama.
- Authoring/hasil memakai DTO allowlist; nama lokal tidak dicampur network object.
- System content immutable, teacher drafts boleh edit, published version frozen.
- Endpoint seed/reset/request access harus dibatasi, same-origin/CSRF-aware,
  bukan GET publik yang mengubah DB. Jangan membocorkan token lewat log/URL.
- Render teks guru sebagai teks/math aman; tidak arbitrary HTML/JS/eval.
- Jangan membangun custom exam dengan menjalankan teacher code di browser.
- Jaga callback auth/cookie handling dan protected routes ketika memindahkan layout.
- Cache hanya shell/public assets untuk shared cache. Jangan cache API hasil,
  auth/session, halaman private berisi payload guru secara global. Storage lokal
  terikat akun; logout/pindah akun tidak menampilkan hasil akun sebelumnya.
- Jangan mengubah backend menjadi adapter sintetis untuk lolos test production.

PETA KODE snapshot audit (petunjuk, cek path di HEAD sebelum mengedit):
- UI guru: `src/features/guru/teacher-shell.tsx`, `teacher-workspace.tsx`.
- Sesi: `src/features/session/cycle-workspace.tsx`, `src/features/exit/workspace.tsx`.
- Layout papan: `src/features/layar/board-shell.tsx`, `board-workspace.tsx`,
  `board-content.tsx`, `src/features/opening/board.tsx`, `src/features/tools/number-line.tsx`.
- Profil: `src/features/layar/capability-test.tsx`, `capability-storage.ts`,
  `src/contracts/board-profile.ts`.
- Koneksi: `src/features/classroom/transport.ts`, `content-transport.ts`,
  `remote-transport.ts`, `src/contracts/presentation.ts`, server pairing/routes.
- Soal: `src/content/templates/registry.ts`, `src/core/package/build.ts`,
  `tool-task.ts`, `opening.ts`, `src/features/package/`.
- Kamera: `src/features/scanner/capture.tsx` dan worker OMR existing.
- Auth lokal lama: `src/app/auth/demo/route.ts` memakai guard localhost/test provider;
  jangan membuka guard ini ke internet sebagai implementasi akun contoh hosted.

## 8. V6 - Skenario browser yang harus benar-benar dilalui

Gunakan Playwright/agent-browser yang tersedia. Jangan hanya menguji fungsi pure.
Gunakan teacher context dan board context TERPISAH. Untuk kriteria proporsional,
assert bounding box/viewport SEBELUM klik; auto-scroll Playwright bukan bukti UI muat.

| ID | Alur | Acceptance inti |
| --- | --- | --- |
| U01 | Data contoh -> aplikasi utama | Tanpa registrasi; URL `/guru/...`; dataset DB tetap sama setelah reload/relogin; bukan `/demo` atau tenant baru |
| U02 | Kelola kelas | Edit nama lokal/absen; UUID stabil; reload benar; tidak ada nama ke network/papan |
| U03 | Mengajar dari sistem | Pilih 7B, pilih set interaktif, sambungkan QR, soal tampil dan bisa dimainkan; state HP-papan konsisten |
| U04 | Reconnect | Pada soal ke-3, putuskan jaringan HP; papan tetap di soal; sambung otomatis/scan QR ulang memulihkan sesi dan nomor soal, tanpa scan/BKT ganda |
| U05 | Revoke/end/takeover | Logout/end/revoke tidak otomatis hidup lagi; QR lama gagal; controller lama tidak bisa menimpa state baru |
| U06 | Preset layar | Tiga preset, contoh nyata, simpan; reload/resize/fullscreen tidak mengulang wizard; semua kontrol muat |
| U07 | Tes sentuh | Satu/dua/empat sentuhan advance sekali; mouse tidak meluluskan multitouch; fallback HDMI tidak buntu |
| U08 | Buat soal kertas | Nama set, lima prompt+ABCD+kunci, simpan, preview lalu gunakan 7B; set tetap tersedia setelah reload |
| U09 | Reuse lintas kelas | Set yang sama digunakan 7C; hasil 7B dan 7C tetap terpisah dan versi tidak berubah |
| U10 | Buat interaktif | Pilih Garis Bilangan dan Menulis; konfigurasi tersimpan; preview dan papan memakai renderer sama; ink tidak persisten |
| U11 | Asesmen dan rekap | Pilih kelas/tanggal/set, cetak form, scan/input tiga respons, simpan; hasil dapat dicari dan dibuka kembali dari DB |
| U12 | Revisi dan form salah | Scan ulang tidak menambah evidence; koreksi memperbarui; kartu dari versi/halaman salah tidak dinilai otomatis |
| U13 | Snapshot histori | Edit set setelah asesmen; hasil lama/kuncinya tidak berubah; arsip siswa tidak menghapus respons |
| U14 | Isolasi dan auth | Dua guru terpisah; board tidak membaca hasil/kunci; akun contoh tidak membaca kelas nyata |
| U15 | Offline | Pilih dua kelas cached dan lanjut yang benar; pending response sync sekali; logout tidak membocorkan cache |
| U16 | Keterpakaian visual | Semua viewport target; prompt/model/kontrol terlihat; tanpa debug copy, overflow fatal, hydration/console error |

Test tambahan: invalid options/kunci, QR kedaluwarsa, permission kamera ditolak,
profile lama/corrupt, storage tidak tersedia, double click Mulai, reconnection
storm/listener cleanup, draft disimpan tanpa publish, dan respons belum masuk.
Targeted tests tidak harus ribuan; harus membuktikan kontrak baru.

Alur tidak dinilai mudah hanya karena semua tombol bisa diklik. Periksa:
- Dari detail kelas yang sudah siap, pilih set dan mulai tidak perlu berputar
  kembali ke beranda atau memilih kelas yang sama berkali-kali.
- Kembali dari editor/preview tidak membuang input atau pilihan aktif.
- Pengguna bisa memahami langkah berikutnya tanpa kata teknis atau manual developer.
- Di HP tombol utama dapat dijangkau dan tidak bertabrakan dengan keyboard.
- Siswa tahu apakah harus menyentuh papan, menulis di buku, atau mengisi kartu.

Label hasil pemeriksaan sebagai walkthrough engineering. Jangan mengklaim 'teruji
user awam/guru' kecuali benar-benar dilakukan dengan orang tersebut.

## 9. Cara validasi yang tidak membuang waktu

- Jangan reinstall dependency jika lockfile tidak berubah.
- Jalankan tests terdampak saat satu batch selesai; tidak full suite setiap file.
- Gunakan schema/SQL integration nyata untuk perubahan auth/DB. Mocks tetap
  membantu, tetapi tidak menggantikan bukti RLS dan persistence.
- Untuk UI, ambil screenshot representatif setelah layout stabil, bukan video
  panjang setiap task. Full verify dijalankan serial pada kandidat akhir.
- Jika verify gagal akibat perubahanmu, perbaiki dan ulang bagian yang gagal,
  lalu final gate yang diperlukan; jangan menerima failed test sebagai minor.
- Tes yang mengabadikan UX/scope lama boleh diperbarui sesuai permintaan baru,
  dengan alasan jelas. Jangan melemahkan privacy/math/security assertions.
- Simpan evidence di `artifacts/qa/video-ready/`: commit/build, daftar perubahan,
  command+exit, screenshot viewport, hasil U01-U16 dan NOT_RUN nyata.
- Pisahkan otomatis lokal, hosted sungguhan, serta fisik. Simulasi touch tidak
  membuktikan panel, file fixture tidak membuktikan kamera HP/cetakan nyata.

Setup rekaman dua perangkat memerlukan origin yang dapat dibuka HP dan papan.
Jangan mengisi QR dengan `127.0.0.1`/localhost komputer: HP akan membuka dirinya
sendiri. Scanner kamera browser memerlukan secure context/izin; gunakan origin
HTTPS yang benar untuk rekaman HP. Jangan sekadar menyarankan HTTP LAN sebagai
jaminan kamera akan bekerja. Bila belum ada hosted origin yang diotorisasi,
catat kebutuhan itu dan handoff langkah tepatnya, bukan klaim QR live telah lulus.

Jalankan migration/seed hanya pada target yang jelas dan diotorisasi; hindari reset
DB nyata. Deploy publik/mengeluarkan biaya memerlukan otorisasi yang sesuai.
Pengguna meminta implementasi cepat, bukan pembelian layanan tersembunyi.

## 10. Definition of Done dan laporan akhir

Jangan menyebut 'video-ready' hanya karena library/domain selesai atau screenshot
bagus. Syarat software inti:
- Normal teacher routes dapat dipakai dengan data contoh persisten tanpa daftar.
- Navigasi empat bagian benar-benar berfungsi, bukan tab kosmetik satu halaman.
- Kumpulan sistem dan guru bisa dipilih, dibuat, dipreview dan dipakai lintas kelas.
- Kedua jenis soal, kartu/scan dan hasil filter kelas/tanggal/set tersambung.
- HP-papan QR connect dan reconnect menjaga sesi/progres serta otorisasi.
- Preset/profil layar tersimpan dan kalibrasi tidak berulang.
- Visual viewport cocok, instruksi jelas, debug wording tidak muncul pada jalur utama.
- Kebenaran core, privasi, RLS, replay dan versi historis tetap terlindungi.
- Tests yang diperlukan lulus dan gap hosted/fisik dicatat apa adanya.

Sesudah selesai, update PLAN.md ringkas. Buat `VIDEO_HANDOFF.md` berisi:
1. Command start persis untuk env rekaman, origin HP/papan, dan route masuk.
2. Cara provisioning/masuk akun contoh tanpa menampilkan secret.
3. Daftar kelas, kumpulan dan hasil contoh siap rekam.
4. Runbook empat adegan: ajar dari sistem; buat soal; reuse+scan+rekap; reconnect.
5. Cara reset dataset contoh untuk take ulang yang tidak merusak data lain.
6. Tabel Selesai / Belum / NOT_RUN, terutama live DB/auth/QR/perangkat.

Laporan akhir pengguna cukup: fitur selesai, flow yang lulus, command run,
known blocker spesifik, dan external checks tersisa. Jangan laporan ribuan baris,
jangan skor kesesuaian buatan, jangan menyebut fitur disabled sebagai selesai.

Mulai sekarang. Kerjakan V1-V6 secara kontinu, pakai keputusan aman yang sudah
tertulis, dan jangan berhenti di tiap subtask atau karena masalah kosmetik.

## 11. Sumber dan batas dokumen ini

Basis produk: 13 catatan terbaru pengguna dan alur yang diminta; source snapshot
ZIP papannalar-PNkhMiKARQZq0GwqdP6GJ; `PapanNalar_Audit.md`; PRD/UX/Brand existing.
Instruksi baru authoring/hasil/main-app sample secara eksplisit memperluas scope
lama. Checkpoint keamanan sintetik vs nyata, TTL dan desain layout adalah arahan
engineering yang diusulkan di sini, bukan klaim sudah ada pada rancangan lama.

Referensi platform yang diperiksa saat menyusun instruksi (baca hanya bila
implementasi API terkait membutuhkan; tidak perlu riset semua ulang):
- Supabase Presence: status presence/reconciliation, bukan data progres persisten.
  `https://supabase.com/docs/guides/realtime/presence`
- Supabase Realtime Authorization: private channel dan otorisasi.
  `https://supabase.com/docs/guides/realtime/authorization`
- MDN getUserMedia: izin dan secure context kamera.
  `https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia`
- W3C Target Size: ukuran target interaksi berbeda dari ukuran visual.
  `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html`
