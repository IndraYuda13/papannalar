# Blueprint UI - PapanNalar Studio

Status: arahan implementasi, bukan screenshot aplikasi jadi.
Semua angka ukuran/budget di bawah adalah usulan engineering yang perlu diukur.
Rujukan teknik: V4-V8 pada SOURCES.md.

## 1. Art direction

Gunakan identitas yang sudah ada: teal #0B6B6B, paper #F7F5F0, ink #14212B,
mint #D8EFEE dan amber #F2A33A. Amber sebagai aksen kecil, bukan teks tipis di atas
putih. Pertahankan Plus Jakarta Sans untuk guru, Atkinson Hyperlegible untuk papan.
Jangan menyertakan file font dari lingkungan agent; pakai dependency font repo.

Karakter visual: studio belajar dengan benda matematika yang hangat, permukaan
matte, outline rapi dan kontras jelas. Aksen 3D memegang tema alat belajar, bukan
robot AI generik atau neon. No glassmorphism berlapis pada form atau area soal.
Bayangan halus boleh; gradient lembut hanya dekorasi terbatas, bukan semua kartu.
Nama/logo/warna kelompok semantik tetap. Jangan meniru brand kompetitor.

Sistem token: spacing 4/8/12/16/24/32/48; radius control 10-12, panel 16-20,
hero maksimal 24; border netral ringan; satu level shadow standar dan satu overlay.
Guru: body 16 dengan line-height sekitar 1.5, heading 24-32 desktop/22-28 mobile,
label 13-14 tetapi hit-area minimal 48. Heading dashboard bukan poster fullscreen.
Board: ikuti preset dan viewport kerja; atur font/model/control sebagai satu
layout. Body guru tidak memakai font raksasa board. Jangan mengecilkan semua
secara global; rapikan grid, pecah paragraf, atau tampilkan detail bertahap.

## 2. Shared components dan state

Bangun/rapikan komponen reusable: TeacherShell, PageHeader, PrimaryAction,
SectionPanel, EmptyState, LoadingState, ErrorNotice, FilterBar, CompactRow,
StatusChip, MobileActionBar, TaskPreview, ToolThumbnail, MotionBoundary,
DecorativeScene, BoardChrome. Nama boleh menyesuaikan repo; jangan duplikasi.

Setiap komponen perlu focus/hover/pressed/disabled/loading yang konsisten.
Status tidak hanya warna. Skeleton tidak menggantikan konten tersimpan saat refresh.
Jangan hide semua konten di opacity 0 sampai IntersectionObserver memicu; default
konten harus dapat dibaca jika JS/animasi gagal. Tidak ada transform pada ancestor
fixed/dialog yang membuat posisi overlay menyimpang.

Navigasi mempertahankan empat destinasi. Sidebar desktop sekitar 224-240 px;
mobile bottom bar empat item dengan safe-area. Sheet/editor mempunyai kembali
yang jelas. Bukan menambahkan sub-navigation sebanyak mungkin. Semua tindakan
utama memiliki label, bukan icon-only yang harus ditebak.

## 3. Peta perubahan setiap halaman

| Route/area | Komposisi baru | Interaksi yang berguna | Larangan/gate |
| --- | --- | --- | --- |
| `/` | Pertahankan redirect/entry yang kini benar | Transisi tidak perlu | Jangan memaksa landing baru sebelum masuk |
| `/masuk` | Split ringan: identitas + GLB/poster papan, form ringkas; mobile form lebih dulu | Reveal sekali; scene sedikit berputar lewat pointer/drag hanya pada area preview | Login tidak menunggu model; akun contoh tetap route asli |
| `/guru` | Sesi aktif menjadi prioritas; header hangat; CTA mulai; kelas terakhir dan daftar kegiatan tersusun | Card resume responsif; ilustrasi papan kecil; reveal section sekali | Jangan isi statistik tanpa data atau menutupi tugas dengan hero tinggi |
| `/guru/kelas` | Daftar kelas yang mudah dipindai, jumlah siswa/sesi yang benar, tambah kelas jelas | Filter/search sesuai data existing; hover halus | Jangan ubah ID siswa/kelas atau menghilangkan draft |
| `/guru/kelas/[id]` | Ringkasan kelas, aksi mengajar, daftar absen/nama lokal, pengaturan sekunder | Edit baris sederhana, status simpan halus, feedback field | Nama tetap lokal; arsip tidak menghapus hasil |
| `/guru/soal` | Tab Dari Sistem/Soal Saya, thumbnail alat, judul dan isi singkat, kosong yang membantu | Poster 3D pada kartu contoh, satu preview 3D atas permintaan | Tidak membuat canvas per kartu; jangan klaim jenis alat unsupported |
| `/guru/soal/[id]` | Editor: daftar item -> form aktif -> preview/bantuan, responsif jadi tabs/sheet | Template one-click dengan pilihan batalkan jika menimpa edit; preview renderer nyata | Field matematika/kunci tidak berubah karena animasi; maksimal lima tetap kecuali HEAD berbeda |
| `/guru/mulai` | Pilih kelas, soal, mode, ringkasan; tahapan pendek dan pilihan sudah terisi dari konteks | Transisi langkah + kembali menjaga isian | Tidak meminta kelas dua kali; QR tidak reset sesi |
| `/guru/sesi/[id]` | Mode control-first: soal saat ini, status layar kecil, navigasi, alat/kendali tambahan di drawer | Tanggapan tombol langsung; transisi soal singkat; indikator simpan yang jujur | Tidak menunggu animasi untuk lanjut; animation key tidak remount core/session |
| `/guru/asesmen` | Tab asesmen/hasil; filter ringkas; tabel desktop dan baris mobile | Pilih tanggal/kelas/kumpulan, empty state sesuai filter | Jangan mengubah timezone, versi soal atau urutan absen |
| `/guru/hasil/[id]` | Ringkasan lembar masuk dan rincian per siswa/soal; heading hirarkis | Expand jawaban dan koreksi dengan feedback; filter tetap | Tidak menampilkan ranking; jangan membuat grafik peningkatan dari seed |
| `/guru/latihan` | Samakan shell/token tanpa menyembunyikan gate; kelompokkan tindakan Paket/Sesi/Bisik | Accordion sekunder, kalimat awam, preview jelas | Tidak mengaktifkan draft pilot lewat redesign |
| `/layar` idle | Profil/preset ringkas, QR jelas dan instruksi singkat; poster ringan bila bermanfaat | Auto-next tes sentuh, success toast, reconnect kecil | Scan QR harus kontras dan tidak dianimasikan/3D |
| `/layar` aktif | Prompt, model, kontrol, tugas terkait dan timer terlihat tanpa scroll utama | Drag/snapping/undo dan motion sebab-akibat singkat | Tidak 3D parallax pada pecahan/grafik; tidak mengirim ink |
| `/demo` | Sinkronkan komponen visual dengan aplikasi utama | Fixture demonstrasi tetap diberi asal sintetis | Jangan mengembalikan Coba data contoh ke /demo |
| Loading/error/offline/no-access | Bahasa satu masalah + satu langkah; informasi yang sudah tersimpan tetap terlihat | Retry/lanjut offline yang memang didukung | Error tidak hilang sebelum dibaca; tidak ada sukses palsu |

Periksa juga dialog pairing, scanner, pemilih template, Bisik statis/online,
profile settings, keluar akun dan konfirmasi destruktif. Route matrix actual HEAD
menentukan jumlah final, bukan tabel ini bila route bertambah.

## 4. Motion grammar

- Tap/hover: 100-160 ms, perubahan warna/shadow; tekan tidak memindah target.
- Dialog/panel: 160-220 ms, opacity + translate kecil 8-12 px, restore focus.
- Pergantian soal: 140-220 ms; data/progres berubah oleh core, bukan onAnimationEnd.
- Reveal gulir: 220-360 ms, sekali per section, stagger total <=350 ms.
- Parallax dekorasi: paling banyak sekitar 12-24 px di hero, desktop saja;
  disable pada reduced-motion, save-data dan viewport kecil.
- Gerak alat: immediate pointer tracking saat dragging; easing hanya saat snap
  atau settle. Tidak animate layout width/height setiap frame.
- Debu/trail: opsional dan sangat sedikit, non-interactive, tidak menutupi angka,
  no confetti saat murid salah/benar, bukan sumber state penilaian.

Gunakan Motion for React hanya bila native CSS tidak cukup; reuse library existing
bila sudah ada. Jangan memasang Motion + GSAP + Lenis bersamaan. Native scrolling
harus dipertahankan; jangan intercept wheel/touch untuk membuat custom page scroll.
Gunakan opacity/transform dan compositor-friendly properties, bukan filter blur
fullscreen bergerak. Tidak memasang will-change permanen pada seluruh halaman.

OS reduced motion dan pilihan 'Kurangi animasi' di pengaturan tampilan berlaku
untuk CSS, Motion dan WebGL sekaligus. Mode presentasi/tampilan ringan menonaktifkan
animasi dekoratif, tetapi langkah model matematika masih dapat dilihat tanpa gerak.

## 5. 3D nyata dengan fallback

Aset dalam `assets/models`: learning-board.glb, balance-scale.glb, algebra-kit.glb.
Poster tiap model ada di `assets/posters`. Geometry asli, tidak mengambil model
pihak ketiga dan tidak memerlukan tekstur/font eksternal. Baca manifest ukuran
aktual sebelum memutuskan import. Aset ilustratif, tidak berisi rig mekanis.

Usulan implementasi: Three.js + React Three Fiber hanya dalam lazy Client Component.
Jika memilih paket tersebut, pin versi yang kompatibel dengan React HEAD melalui
peer metadata; jangan mengganti React/Next hanya untuk library efek.
`next/dynamic(..., {ssr:false})` ditempatkan dalam Client Component, bukan server
page/layout. Parent menyiapkan aspect-ratio dan poster agar tidak ada layout shift.

Default canvas on-demand (`frameloop="demand"` bila R3F), lights sederhana,
DPR sekitar 1-1.5 (batas maksimum 2 hanya jika perangkat memadai), tidak postprocessing
atau realtime shadow berat. Satu scene aktif; saat pointer/focus tidak berinteraksi
stop setelah settling. Matikan saat tab hidden/offscreen. Dispose resource saat
unmount. Orbit dibatasi: tidak zoom liar, tidak mencuri scroll, tidak capture semua
pointer dari halaman. Tidak network call pada setiap orbit.

Jika WebGL gagal/blocked, poster menggantikan scene dengan ukuran identik. Bila
save-data terdeteksi atau pengguna pilih hemat, jangan unduh GLB/library 3D.
Jangan menganggap deviceMemory selalu tersedia. Ketersediaan API dan pilihan
pengguna lebih penting daripada menebak model HP.

Deployment menyalin assets yang diperlukan ke `public/assets/pn-ui-v2/`.
Loader memakai URL lokal dan cache asset berversi. Shell offline tidak perlu
precache seluruh runtime 3D; poster cukup sebagai fallback. Hindari menaruh file
.glb besar di JS base64. Asset bukan font dan tidak memuat data anak.

## 6. Budget usulan dan verifikasi

Target: <=500 KB model pada tampilan pertama; paket ini menyediakan model jauh
lebih kecil, tetapi biaya JS renderer tetap diukur terpisah. Incremental compressed
JS 3D target <=250 KB per lazy route. Bila bundler melebihi, load hanya setelah
interaksi atau lanjut poster-first dengan gap budget tercatat; jangan ganti menjadi
unduh global karena lebih mudah. Normal guru route tanpa scene dan seluruh scanner
harus tidak memuat chunk Three.js. Gunakan build analyzer yang sudah tersedia,
tidak membeli tool baru.

Tidak ada layout shift yang terlihat saat scene siap. Uji 360x800, 390x844,
1366x768 untuk guru; 1280x720, 1366x768, 1920x1080 untuk board. Form diuji saat
keyboard dan text scaling 130%. Table boleh horizontal-scroll dalam region yang
jelas di HP, bukan membuat seluruh body melebar. Board soal tidak boleh bergantung
scroll agar tombol terlihat. Target p95 respons alat <500 ms tetap target yang
harus diukur; desktop/headless tidak membuktikan HP sekolah.

## 7. Pemeriksaan visual yang wajib nyata

Ambil sebelum/sesudah representatif dari login, beranda, daftar kelas, editor,
asesmen, hasil, controller dan board. Buka screenshot, jangan hanya menyimpan.
Uji keadaan isi panjang, kelas kosong, nama lokal panjang fiktif, zoom teks,
error/simpan/offline, WebGL mati dan reduced motion. Sebelum klik Playwright,
assert elemen utama berada di viewport agar auto-scroll tidak menutupi bug.

Lakukan walkthrough keyboard dan guru-awam secara engineering (tanpa mengklaim
partisipan guru). Nama menu, ukuran, instruksi dan next action harus bisa dipahami
sekali lihat. UI yang cantik tetapi state hilang, key bocor atau hasil berubah
adalah regression, bukan tradeoff yang diperbolehkan.
