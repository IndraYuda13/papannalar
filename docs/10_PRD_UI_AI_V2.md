# Addendum PRD aktif - UI menyeluruh dan AI dua protokol

Versi: PN-UI-AI-v2, 2 Oktober 2026. Status: permintaan produk untuk diimplementasikan.
Bukan laporan bahwa fitur sudah tersedia. Basis: permintaan terbaru pengguna,
source ui-polish 1 Oktober, dan referensi platform pada `SOURCES.md`.

## 1. Masalah yang ditangani

P1. UI telah berfungsi tetapi belum mempunyai komposisi/karakter visual yang kuat
secara merata. Menambahkan animasi pada beranda saja tidak menyelesaikan editor,
rekap, kendali HP, dan papan yang masih terasa kurang rapi.
P2. Pengguna menghendaki interaksi lebih hidup: motion saat gulir, tanggapan aksi,
dan objek 3D yang membantu mengenali produk/alat tanpa mengurangi keterbacaan.
P3. AI pada baseline mengunci model/endpoint Anthropic; pencatatan pemakaian dan
schema SQL juga mengunci model yang sama. Penggantian provider belum menjadi
konfigurasi yang dapat dipakai dengan aman.

Tujuan: pengalaman mengajar lebih jelas dan menarik; kebebasan memilih endpoint AI
yang memenuhi dua kontrak; sistem tetap bisa dipakai ketika AI/WebGL gagal.
Tidak ada perubahan pada tujuan matematika, privasi, atau cara siswa menjawab.

## 2. Perubahan resmi terhadap dokumen lama

| Area | Aturan yang berlaku setelah addendum ini |
| --- | --- |
| Brand | Warna/nama/font dipertahankan. Kedalaman lembut, ilustrasi 3D dan gerak terarah diizinkan. Larangan 3D dekoratif mutlak diganti pembatasan konteks. |
| Pembelajaran | Nilai kuantitatif pecahan/grafik/bilangan tetap akurat. Bentuk 3D bukan pengganti soal 2D yang perlu dibandingkan. |
| UI | Seluruh route dan state ditinjau; normalisasi komponen, bukan rebuild domain. |
| AI | OpenAI-compatible Chat Completions dan Anthropic-compatible Messages menjadi dua jalur wajib. Model tidak hardcoded. |
| Biaya | Perhitungan mengikuti profil endpoint/model dan harga yang diset operator, bukan satu asumsi Haiku. |
| Eksekusi | Continuous U0-U5; aturan berhenti setiap subtask lama tidak berlaku pada run ini. |
| Paper | Kebutuhan baru tidak otomatis menjadi klaim kemampuan produk yang sudah selesai. |

Dokumen pembelajaran 02 dan katalog 03 tetap utuh. Perubahan yang benar-benar
mengubah isi tugas matematika perlu keputusan terpisah, bukan efek samping desain.

## 3. Prinsip desain produk

Arah: **studio belajar yang hangat dan modern**. Guru mendapat workspace yang
tenang; siswa mendapat papan yang bersih dengan alat yang terasa responsif.
Bukan tampilan SaaS generik dengan banyak kartu statistik kosong, bukan taman
bermain beranimasi terus-menerus, dan bukan tiruan visual produk lain.

Aksi utama harus jelas sebelum melihat efek. Konten dan kontrol tetap tersedia
saat animasi, WebGL, network atau layanan AI tidak bekerja. Tidak ada scroll
hijacking, cursor khusus wajib, audio otomatis, carousel tanpa kontrol, angka
kemajuan fiktif, atau notifikasi teknis yang mendominasi layar normal.

## 4. Persyaratan UI

### UI-01 - Cakupan menyeluruh

Berlaku untuk `/masuk`, `/guru`, `/guru/kelas`, `/guru/kelas/[id]`, `/guru/soal`,
`/guru/soal/[id]`, `/guru/mulai`, `/guru/sesi/[id]`, `/guru/asesmen`,
`/guru/hasil/[id]`, `/guru/latihan`, `/layar`, serta `/demo` yang masih ada.
`/` tetap menghormati entry/redirect existing. Jangan membuat landing baru sebagai
pengganti merapikan aplikasi. Sertakan loading/empty/error/offline/no-access dan
modal/drawer terkait. Route baru pada HEAD ikut inventaris.

Acceptance: route matrix berisi tujuan, perubahan nyata, screenshot terpilih,
status tes. Tidak ada route aktif yang masih mendapat tata letak rusak atau label
internal hanya karena disebut legacy. Detail operator dapat tetap teknis.

### UI-02 - Desain konsisten dan bahasa manusia

Empat menu utama tetap jelas. Halaman data padat memakai tabel/baris teratur,
bukan semuanya kartu besar. Editor memisahkan daftar soal, field aktif, bantuan
contoh dan preview. HP memakai panel/tab sesuai ruang; form tidak reset saat
preview. Label tindakan singkat: Pilih kelas, Buat soal, Gunakan contoh, Pratinjau,
Simpan, Tampilkan di layar, Periksa jawaban.

Perbaikan visual tidak boleh menghilangkan status 'Belum tersinkron' atau kegagalan
simpan. Informasi normal cukup indikator ringan; error tetap memberi langkah lanjut.
Instruksi alat berdasarkan state/parameter nyata, bukan template statis yang salah.

### UI-03 - Gerak dan gulir

Halaman pengantar/katalog boleh memakai reveal sekali, stagger pendek dan parallax
kecil untuk objek dekoratif. Daftar/hasil/editor mengutamakan kestabilan target klik.
Board aktif memakai transisi soal dan tanggapan aksi, bukan scroll panjang.

Acceptance: reduced motion mematikan perpindahan besar/parallax/auto-rotation;
keyboard tidak kehilangan fokus; kembali dari detail mempertahankan posisi daftar
bila mekanisme existing mendukung; efek tidak menghambat pengisian atau scan.

### UI-04 - Aset 3D

Minimal satu scene 3D nyata terlihat pada konteks yang sesuai, misalnya halaman
masuk dan komponen Jelajahi Alat pada beranda/katalog. Gunakan tiga GLB/poster
bundled secara selektif. Daftar kartu memakai poster; hanya satu canvas aktif saat
preview, bukan satu WebGL context per kartu.

Geometry dekoratif tidak memuat nama/soal siswa. Animasi scene idle berhenti saat
objek diam/di luar viewport/tab tersembunyi. Fallback poster muncul saat WebGL
unsupported/context lost, data hemat, atau pengguna memilih tampilan ringan.
Kontrol dan teks tidak ditempatkan hanya di dalam canvas.

Acceptance: WebGL dimatikan tetap bisa login, memilih kelas, mengajar dan melihat
hasil. Halaman scanner tidak mengimpor atau mengunduh engine 3D. Asset mempunyai
manifest lisensi, ukuran, hash, path dan batas penggunaan.

### UI-05 - Papan tetap merupakan alat belajar

Soal, model, serta kontrol utama muat viewport. Preserve preset Ringkas/Seimbang/
Besar, profil, no-touch fallback, QR/reconnect, remote dan undo. Animasi tidak
menambah event penilaian, tidak mengubah timer, dan tidak mengaburkan tanda minus.
Pecahan setara tetap setara secara visual; efek 3D/perspektif tidak boleh membuat
panjang yang sama terlihat berbeda pada model jawaban.

Tidak ada nama siswa, kunci sebelum pembahasan, level, skor individu, atau ranking
di payload/HTML papan. Ink tetap RAM. Ubah ukuran tampak dan hit-area secara sadar,
tidak memakai global scale atau overflow hidden untuk menyembunyikan konten.

## 5. Persyaratan AI

### AI-01 - Dua protokol, satu domain aplikasi

Wajib implementasi:
- `openai-chat-completions`: POST `<base>/chat/completions`.
- `anthropic-messages`: POST `<base>/messages`, bukan memaksa Claude melalui shim OpenAI.

Base adalah API root eksplisit (biasanya termasuk `/v1`). OpenAI Responses bukan
sinonim Chat Completions; adapter Responses tidak menjadi syarat run ini. Provider
yang hanya mendukung Responses dinyatakan belum didukung, bukan ditebak.

Berlaku untuk endpoint resmi atau gateway lain yang memang lulus kontrak tersebut.
'Terbaca sebagai OpenAI-compatible' tidak menjamin tools, reasoning, streaming,
JSON Schema, alias model dan token field identik. Profil menyatakan kemampuan.

### AI-02 - Konfigurasi operator

Protocol/base/model/key dapat diganti tanpa mengubah kode domain atau build UI.
Konfigurasi server saja, bukan form bebas untuk guru memasukkan arbitrary URL/key.
Minimum satu profil aktif; pergantian env dapat memerlukan restart server.
Tidak ada marketplace provider, model listing otomatis, BYOK setiap guru atau
perpindahan vendor otomatis ketika request gagal.

Contoh tersedia pada `config/.env.ui-ai.example`. Migrasi konfigurasi Anthropic
lama tetap bekerja saat config baru belum disediakan; konflik antarconfig ditolak
jelas tanpa mencampur key lama dengan endpoint baru.

### AI-03 - Pekerjaan yang diizinkan

Bisik: membantu guru memakai kartu strategi yang sah, maksimal 80 kata sesuai
validator existing. Enrichment: memilih/menyesuaikan konteks dalam kontrak frame
terkurasi dan approval existing. Bukan bebas menulis soal baru tanpa validator.

AI tidak menentukan kunci, nilai, BKT, kelompok, identitas, atau diagnosis murid.
System solver, kunci guru, version binding, hasil historis dan replay tetap pemilik
kebenaran. Pergantian provider tidak membuka semua gate review.

### AI-04 - Keamanan dan ketahanan

Tidak ada key di browser/log, tidak ada data siswa/foto kartu/ink yang dikirim AI.
Nama yang disimpan lokal tetap lokal; tidak menambahkan RAG/attachment upload.
Strict allowlist input dan output domain tetap berlaku. Endpoint harus berasal
config operator dan disetujui kebijakan egress; jangan menerima URL request user.

Kegagalan konfigurasi, rate limit, timeout, refusal, JSON invalid, budget habis dan
provider mati menampilkan kartu statis, bukan membatalkan sesi atau menyatakan
jawaban dari AI. Tidak retry ke provider kedua tanpa izin dan pencatatan biaya.

### AI-05 - Catatan pemakaian yang benar

Ledger harus mencatat profil/protokol/model yang diminta dan model yang dilaporkan,
versi config/prompt, token diketahui atau null, serta status hasil. Harga dan cap
terkait profil, bukan nilai kiriman browser. Riwayat Haiku tetap utuh.

Ketiadaan usage pada gateway tidak berarti gratis/nol token. Reservasi konservatif
dan rate limit tetap aktif. Tidak mengembalikan budget otomatis pada timeout yang
mungkin sudah menghasilkan tagihan. Batas/harga kosong menghalangi live call,
bukan menjadi izin pemakaian tanpa batas.

### AI-06 - Pengalaman guru

Guru memakai tombol 'Bantuan mengajar' / 'Sesuaikan saran', tidak memilih protocol.
Status singkat: Saran siap, Menggunakan panduan tersimpan, atau Coba lagi nanti.
Detail operator membedakan: config valid, endpoint teruji, konten belum direview,
anggaran belum diset. Jangan hanya menampilkan 'AI aktif' padahal semua task diblokir.
Uji koneksi memakai teks sintetis dan hanya dengan izin biaya eksplisit.

## 6. Tolok ukur dan batas klaim

Target teknik run ini: no overflow kritis pada viewport uji, alur utama tidak
memerlukan langkah tambahan, semua route dibuka, tidak ada request key/client,
load 3D tidak masuk critical path scanner. Budget visual dan waktu detail ada
pada blueprint. Angka adalah target, bukan jaminan HP tertentu.

Pisahkan empat status: implemented, tested-local, tested-live, not-run. Coverage
atau model count bukan persentase usability. Tidak menjamin satu jam, hemat
sejumlah token tertentu, kompatibilitas universal atau hasil belajar meningkat.
