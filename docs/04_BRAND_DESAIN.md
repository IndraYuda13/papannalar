# Brand dan Desain

## 1. Nama, arti, dan tagline

**PapanNalar** menggabungkan dua kata. *Papan* adalah papan interaktif dan papan tulis, pusat perhatian di kelas. *Nalar* adalah kemampuan bernalar yang menjadi inti numerasi, sekaligus menjaga jejak nama PindaiNalar.

- **Penulisan:** PapanNalar, satu kata, huruf P dan N kapital. Hindari "Papan Nalar", "Papannalar", atau semua huruf kapital. Huruf kecil semua hanya untuk domain dan nama akun.
- **Tagline utama:** *Satu papan, setiap siswa belajar di levelnya.*
- **Tagline pendek** (ikon, stiker, media sosial): *Ajar sesuai level.*
- **Satu kalimat untuk juri:** PapanNalar mengubah papan interaktif di kelas menjadi alat berpikir siswa dan asisten guru: mengecek level tiap siswa dalam sekitar 10 menit, membentuk kelompok, lalu mengajak siswa menyentuh papan untuk memahami kenapa sebuah cara benar dan gunanya, tanpa HP siswa.

**Nama fitur (dipakai konsisten di aplikasi, paper, dan video)**

| Nama | Artinya | Kenapa nama ini |
| --- | --- | --- |
| Sesi Tepat Level | Satu pertemuan yang dijalankan dengan PapanNalar | Terjemahan langsung Teaching at the Right Level |
| Kartu Nalar | Kartu jawab kertas untuk siswa | Menegaskan bahwa siswa tidak perlu perangkat |
| Tangga Nalar | 22 anak tangga numerasi, Fase A sampai E | Tangga memberi kesan naik bertahap, bukan "pintar" atau "bodoh" |
| Paket Sesi | Semua materi sesi yang disiapkan agen | Guru cukup menekan satu tombol |
| Layar Kelas | Tampilan untuk papan interaktif, proyektor, atau TV | Tidak mengikat ke satu jenis perangkat |
| Bisik | Saran untuk guru saat mendampingi kelompok | Saran datang pelan dan pribadi, seperti bisikan rekan guru |
| Kartu Keluar | Tiga baris penutup sesi: soal, alasan, soal konteks | Istilah umum "exit ticket" dalam bahasa Indonesia |
| Alat Nalar | Benda matematika di papan yang disentuh siswa: garis bilangan, batang pecahan, timbangan, dan lainnya | Alat untuk bernalar, bukan permainan |
| Stasiun Papan, Guru, Mandiri | Tiga tempat belajar yang digilir kelompok dalam satu sesi | Menyebut tempat, jadi siswa tahu harus pindah ke mana |
| Pilot, Navigator | Siswa yang menyentuh papan dan siswa yang memberi arahan | Dua peran yang sama penting; Navigator wajib menjelaskan kenapa |
| Pembuka Bermakna | Masalah nyata dan tebakan di awal sesi | Siswa tahu untuk apa belajar hari itu |
| Refleksi | Tiga kalimat rumpang di akhir sesi, termasuk gunanya | Istilah Pembelajaran Mendalam yang sudah dikenal guru |
| Tes Kemampuan Papan | Pemeriksaan sekali per papan, sekitar 1 menit | Yang diuji perangkatnya, bukan siswa |

**Status nama:** penelusuran web singkat tidak menemukan aplikasi bernama PapanNalar. Pemeriksaan di pangkalan data merek DJKI dan ketersediaan domain belum dilakukan.

## 2. Logo

Logonya berupa papan (layar kelas) berisi tangga tiga anak tangga, dengan titik amber di puncak sebagai momen "paham". Gambar di bawah adalah konsep awal yang dibuat tim untuk disempurnakan desainer, bukan versi final.

&#91;image: Konsep logo PapanNalar dalam lima varian\]

**Arti bentuk**

- **Papan dengan kaki:** layar kelas, termasuk papan interaktif. Kaki papan dihilangkan di ukuran kecil supaya tetap terbaca.
- **Tangga:** Tangga Nalar; setiap siswa naik dari level tempat ia berada.
- **Titik amber:** momen seorang siswa paham. Ini satu-satunya warna hangat di logo.

**Aturan pakai**

| Aturan | Ketentuan |
| --- | --- |
| Ruang kosong di sekeliling logo | Minimal setinggi titik amber dikali dua, di keempat sisi |
| Ukuran minimum | Ikon tanpa kaki papan 24 px; logo lengkap dengan tulisan 120 px lebarnya |
| Varian | Utama (latar terang), putih (latar teal), latar gelap, ikon aplikasi |
| Tulisan | Plus Jakarta Sans ExtraBold; "Papan" warna Ink 900, "Nalar" warna Teal 700 |
| Dilarang | Meregangkan atau memiringkan logo, mengganti warna di luar palet, menambah bayangan atau gradasi, menaruh di atas foto yang ramai, memutar titik amber ke posisi lain |

**Berkas yang perlu disiapkan desainer:** SVG utama, SVG putih, ikon aplikasi 192 px dan 512 px untuk manifest PWA, favicon 32 px, dan versi hitam putih untuk dicetak di Kartu Nalar.

## 3. Warna

Warna utama teal diambil dari Sungai Mahakam, dan aksen amber dari cahaya senja. Setiap pasangan warna teks dan latar di bawah sudah dihitung dengan rumus kontras WCAG 2.1, dan semuanya lolos AA (minimal 4,5 : 1 untuk teks biasa).

&#91;image: Palet warna PapanNalar dengan rasio kontras\]

**Token warna untuk developer**

| Token | Hex | Dipakai untuk | Kontras (dihitung) |
| --- | --- | --- | --- |
| --pn-teal-700 | #0B6B6B | Tombol utama, tautan, logo | 6,31 dengan putih; 5,79 dengan Kertas |
| --pn-teal-800 | #085252 | Tombol saat ditekan atau hover | 8,98 dengan putih |
| --pn-teal-100 | #D8EFEE | Latar sorotan, baris terpilih | 13,65 dengan Ink 900; 5,26 dengan Teal 700 |
| --pn-amber-500 | #F2A33A | Titik "paham", lencana, sorotan kecil. Hanya dengan teks Ink 900 | 7,86 dengan Ink 900. Tidak boleh untuk teks di atas putih (2,08) |
| --pn-amber-700 | #9A5B00 | Teks aksen di atas putih | 5,43 dengan putih |
| --pn-ink-900 | #14212B | Teks utama | 16,38 dengan putih |
| --pn-ink-600 | #4A5A66 | Teks sekunder | 7,13 dengan putih |
| --pn-ink-400 | #8494A0 | Garis tepi dan ikon non-teks saja | 3,12 dengan putih (cukup untuk komponen, tidak untuk teks) |
| --pn-kertas | #F7F5F0 | Latar aplikasi | 15,03 dengan Ink 900 |
| --pn-putih | #FFFFFF | Latar kartu | - |
| --pn-sukses | #1E7B3A | Status berhasil | 5,32 dengan putih |
| --pn-peringatan | #8A5A00 | Status perlu dicek | 5,93 dengan putih |
| --pn-bahaya | #B3261E | Galat | 6,54 dengan putih |

**Warna kelompok (tampil di Layar Kelas).** Warna selalu dipasangkan dengan bentuk dan nama, supaya siswa buta warna tetap bisa membedakan kelompok. Teks putih di atas keempat warna ini lolos AA.

| Kelompok | Hex | Bentuk | Kontras teks putih |
| --- | --- | --- | --- |
| Biru | #1F5FA8 | Segitiga | 6,44 |
| Oranye | #A04E00 | Lingkaran | 5,86 |
| Hijau | #0F7A5A | Kotak | 5,31 |
| Ungu | #8A3F8C | Belah ketupat | 6,62 |

**Skala level (hanya di HP guru, tidak pernah di Layar Kelas).** Warna menunjukkan jarak anak tangga siswa ke target kelasnya, bukan kodenya, jadi lima warna cukup untuk 22 anak tangga di semua jenjang. Makin dekat ke target, makin gelap tealnya. Contoh kelas 7 (target D5): D1 paling terang, D4 hampir paling gelap.

| Jarak ke target kelas | Hex | Warna teks | Kontras |
| --- | --- | --- | --- |
| 4 anak tangga atau lebih di bawah | #E3F2F1 | Ink 900 | 14,22 |
| 3 di bawah | #B7DEDB | Ink 900 | 11,30 |
| 2 di bawah | #7FC2BE | Ink 900 | 8,08 |
| 1 di bawah | #237D79 | Putih | 4,91 |
| Di target atau Lanjut | #085252 | Putih | 8,98 |

```css
:root {
  --pn-teal-700: #0B6B6B; --pn-teal-800: #085252; --pn-teal-100: #D8EFEE;
  --pn-amber-500: #F2A33A; --pn-amber-700: #9A5B00;
  --pn-ink-900: #14212B; --pn-ink-600: #4A5A66; --pn-ink-400: #8494A0;
  --pn-kertas: #F7F5F0; --pn-putih: #FFFFFF;
  --pn-sukses: #1E7B3A; --pn-peringatan: #8A5A00; --pn-bahaya: #B3261E;
  --pn-grup-biru: #1F5FA8; --pn-grup-oranye: #A04E00; --pn-grup-hijau: #0F7A5A; --pn-grup-ungu: #8A3F8C;
  /* skala level: jarak anak tangga siswa ke target kelas (4 = 4 atau lebih) */
  --pn-jarak-4: #E3F2F1; --pn-jarak-3: #B7DEDB; --pn-jarak-2: #7FC2BE; --pn-jarak-1: #237D79; --pn-jarak-0: #085252;
}
```

MVP memakai tema terang saja. Layar Kelas sengaja terang karena ruang kelas biasanya terang; tema gelap masuk roadmap.

## 4. Tipografi

Dua keluarga huruf, keduanya berlisensi SIL Open Font License 1.1 sehingga gratis dipakai dan disematkan di aplikasi.

| Huruf | Dipakai di | Alasan | Sumber |
| --- | --- | --- | --- |
| Plus Jakarta Sans | Logo, Aplikasi Guru di HP, dasbor web | Huruf buatan Indonesia: dirancang Gumpita Rahayu (Tokotype) untuk program +Jakarta City of Collaboration tahun 2020 | [Repositori resmi](https://github.com/tokotype/PlusJakartaSans) |
| Atkinson Hyperlegible | Layar Kelas (soal, angka, pilihan jawaban) dan cetakan Kartu Nalar | Dibuat Braille Institute agar huruf yang mirip mudah dibedakan, termasuk 1, l, dan I, serta O dan 0. Penting untuk angka yang dibaca dari bangku belakang | [Repositori resmi](https://github.com/googlefonts/atkinson-hyperlegible) |

**Skala huruf Aplikasi Guru (HP)**

| Gaya | Ukuran / tinggi baris | Ketebalan |
| --- | --- | --- |
| Display | 28 / 34 px | ExtraBold 800 |
| Judul 1 | 22 / 28 px | Bold 700 |
| Judul 2 | 18 / 24 px | SemiBold 600 |
| Isi | 16 / 24 px | Regular 400 |
| Kecil | 14 / 20 px | Regular 400 |
| Keterangan | 12 / 16 px | Regular 400; hanya untuk info tambahan |

**Skala huruf Layar Kelas (pada 1920 x 1080)**

| Elemen | Ukuran | Ketebalan |
| --- | --- | --- |
| Teks soal | 64 px (minimal 56 px) | Bold 700 |
| Pilihan jawaban | 48 px | Regular 400, huruf pilihan Bold |
| Nama kelompok | 40 px | Bold 700 |
| Nomor absen | 36 px | Bold 700 |
| Timer | 48 px, angka lebar tetap | Bold 700 |
| Tugas mandiri dan pilihan alasan kartu keluar | Minimal 40 px | - |
| Instruksi dan status yang juga dibacakan guru | Minimal 26 px | Regular 400 atau Bold 700 |
| Label di dalam model (angka sumbu, keterangan garis), dibaca siswa di depan papan | Minimal 22 px | Bold 700 |

**Aturan penulisan matematika**

- Pecahan ditampilkan bertumpuk memakai KaTeX, bukan garis miring, kecuali di dalam kalimat.
- Tanda minus memakai karakter − (U+2212), tanda kali memakai ×, bukan huruf x atau tanda bintang.
- Desimal memakai koma dan ribuan memakai titik sesuai kebiasaan Indonesia (0,25 dan 1.500). Semua format angka lewat satu fungsi bersama supaya kunci jawaban, pilihan, dan tampilan selalu sama.

**Cara memuat huruf:** dipasang dari paket npm @fontsource dan disimpan di cache PWA, bukan dimuat dari CDN saat aplikasi berjalan. Tujuannya agar Layar Kelas tetap tampil benar tanpa internet.

## 5. Maskot: Nala si pesut Mahakam

Nala adalah pesut Mahakam yang sabar dan suka bertanya balik. Namanya diambil dari kata "nalar". Gambar di bawah adalah konsep awal untuk dilanjutkan ilustrator.

&#91;image: Konsep maskot Nala, pesut Mahakam\]

**Kenapa pesut Mahakam**

- Pesut Mahakam (*Orcaella brevirostris*) hidup di sistem Sungai Mahakam, Kalimantan Timur, dan berstatus kritis (critically endangered). Populasinya diperkirakan tinggal 62 ekor menurut riset Yayasan Konservasi RASI ([Kaltimetam, Oktober 2025](https://kaltimetam.id/populasi-tinggal-62-pesut-mahakam-resmi-masuk-daftar-merah-iucn/)).
- Lombanya diselenggarakan Politeknik Negeri Samarinda. Uji coba pertama paling realistis di Bandung karena dekat dengan tim, sedangkan Kaltim menjadi sasaran perluasan karena sekitar 3.900 papan interaktif sudah dibagikan di sana.
- Pesannya selaras dengan TaRL: tidak ada yang ditinggal.

**Ciri visual yang wajib dijaga ilustrator**

- Kepala membulat tanpa moncong dan sirip punggung kecil yang membulat, sesuai ciri pesut.
- **Ekornya mendatar, bukan tegak seperti ekor ikan.** Pesut adalah mamalia. Konsep pertama kami sempat salah di bagian ini, jadi harus dicek ulang.
- Warna tubuh abu kebiruan (#6F8FA0, bayangan #5E7D8C), perut terang (#DCE6EA), pipi dan percikan "paham" amber (#F2A33A).
- Desain harus orisinal dan tidak meniru maskot atau logo pesut yang sudah dipakai pihak lain.

**Kepribadian dan kalimat khas**

| Sifat | Tampak di aplikasi sebagai |
| --- | --- |
| Sabar | "Belum bisa itu tanda sedang belajar." |
| Penasaran | "Yuk, cek lagi langkahnya." |
| Merayakan usaha, bukan kepintaran | "Minggu ini 6 siswa naik satu anak tangga." |

**Kapan Nala muncul**

| Muncul | Tidak muncul |
| --- | --- |
| Pengenalan aplikasi dan panduan guru | Layar cek level, karena mengganggu fokus siswa |
| Keadaan kosong (misalnya belum ada kelas) | Di samping nama atau nomor absen siswa tertentu |
| Perayaan kemajuan tingkat kelas atau kelompok | Reaksi sedih atau kecewa terhadap jawaban siswa |
| Layar menunggu sinkronisasi | Iklan atau materi yang tidak terkait pembelajaran |
| Di Alat Nalar: penanda yang melompat di garis bilangan, pemilik pekerjaan keliru di tugas Cari Kesalahan, dan di layar Refleksi | Layar kartu keluar. Kesalahan di Cari Kesalahan selalu milik Nala, tidak pernah milik siswa |

**Pose yang perlu dibuat ilustrator:** menyapa, berpikir, menunjuk (untuk panduan), merayakan (untuk kelas), dan menunggu (untuk sinkronisasi).

Halaman "Tentang" di aplikasi memuat satu paragraf tentang pesut Mahakam dan tautan ke lembaga konservasi. PapanNalar tidak boleh mengklaim kerja sama dengan lembaga mana pun sebelum ada kesepakatan tertulis.

## 6. Suara dan gaya bahasa

PapanNalar berbicara seperti rekan guru yang tenang: singkat, sopan, dan tidak pernah menghakimi siswa.

| Kepada | Nada | Aturan |
| --- | --- | --- |
| Guru (Aplikasi Guru, Bisik) | Rekan kerja yang hormat | Sapa "Bapak/Ibu" hanya di pengenalan aplikasi; selebihnya kalimat langsung. Maksimal 2 kalimat per pesan. Sebut apa yang terjadi dan apa langkah berikutnya |
| Siswa (Layar Kelas) | Menyemangati, netral | Tidak ada nama, level, atau peringkat. Fokus pada langkah, bukan pada orang |
| Wakasek dan dinas (ringkasan) | Laporan faktual | Angka selalu dengan satuan dan periode. Tanpa kata sifat berlebihan |

**Istilah yang dipakai dan yang dihindari**

| Pakai | Hindari | Alasan |
| --- | --- | --- |
| Level, anak tangga | Pintar, bodoh, lemah, rendah | Label kemampuan melekat ke diri siswa |
| Kelompok Segitiga Biru | Kelompok remedial, kelompok lambat | Stigma di depan teman sekelas |
| Belum menguasai | Gagal, salah total | Kemampuan bisa berkembang |
| Cek level | Tes, ujian | Siswa lebih tenang; hasilnya bukan nilai rapor. Nama Tes Kemampuan Papan tetap dipakai karena yang diuji adalah perangkatnya, bukan siswa |
| Saran | Jawaban pasti, rekomendasi AI yang benar | Bisik bisa keliru; guru yang memutuskan |
| Dibuat oleh templat dan diperiksa kode | Dibuat AI canggih | Jujur tentang apa yang dikerjakan AI |

**Contoh teks antarmuka untuk momen penting**

| Momen | Teks |
| --- | --- |
| Layar Kelas menunggu pasangan | Masukkan kode ini di HP Bapak/Ibu: 482 915 |
| Kartu terbaca | Absen 07 terbaca |
| Foto buram | Fotonya kurang jelas. Dekatkan HP dan tahan sebentar. |
| Nomor absen ganda | Absen 12 sudah dipindai. Ini kartu siapa? |
| Kelompok terbentuk | 3 kelompok siap. Ketuk kelompok untuk melihat alasannya. |
| Tanpa internet | Tidak ada internet. Pemindaian tetap jalan dan akan disinkronkan nanti. |
| Layanan LLM gangguan | Cerita soal tidak bisa dibuat sekarang. Soal tetap siap tanpa cerita. |
| Keadaan kosong | Belum ada kelas. Buat kelas pertama dalam satu menit. |
| Layar Kelas saat cek level | Soal 3 dari 5. Pilih ? kalau belum tahu. |

Seluruh teks memakai bahasa Indonesia baku yang santai. Tidak memakai tanda seru berlebihan dan tidak memakai emoji di Layar Kelas.

## 7. Ikon, ilustrasi, dan komponen dasar

Semua komponen dibangun dari token di bagian Warna dan Tipografi. Library yang dipakai: Tailwind CSS dengan komponen shadcn/ui, ikon lucide-react (lisensi ISC), dan KaTeX (lisensi MIT) untuk rumus.

**Aturan umum**

- Jarak memakai kelipatan 4 px: 4, 8, 12, 16, 24, 32, 48.
- Sudut: kartu 12 px, tombol 10 px, chip dibulatkan penuh.
- Target sentuh minimal 48 x 48 px di HP. Di papan, objek yang diseret minimal 88 px dan tombol minimal 96 px pada layar 1920 x 1080.
- Bayangan hanya satu tingkat dan tipis; tanpa gradasi.
- Ikon garis 2 px dari lucide-react. Empat ikon bentuk kelompok (segitiga, lingkaran, kotak, belah ketupat) dibuat sendiri sebagai SVG isi penuh.
- Ilustrasi datar, maksimal tiga warna dari palet, tanpa gradasi.

**Komponen**

| Komponen | Isi | Keadaan | Catatan |
| --- | --- | --- | --- |
| Tombol | Label, ikon opsional | Utama (Teal 700), sekunder (garis), bahaya, nonaktif, memuat | Satu tombol utama per layar |
| Kartu Kelompok (Layar Kelas) | Kepala berwarna grup, ikon bentuk putih, nama kelompok, deretan chip nomor absen | Biasa, disorot | Tanpa nama siswa dan tanpa angka level |
| Chip Level (HP guru) | Kode anak tangga (misalnya D1) dengan warna skala level | Biasa, berubah (ada panah naik atau turun) | Tidak pernah tampil di Layar Kelas |
| Jendela Pindai | Tampilan kamera, empat sudut panduan, status teks | Mencari, terbaca, buram, ganda | Getar dan bunyi saat terbaca |
| Kartu Soal (Layar Kelas) | Nomor soal, teks soal, 4 pilihan dan ?, timer | Menunggu, berjalan, waktu habis | Huruf Atkinson Hyperlegible sesuai skala Layar Kelas |
| Kartu Bisik | Kode miskonsepsi, 3 pertanyaan pemantik, 1 cara menjelaskan, 1 soal cek | Offline (kartu statis), online (disesuaikan), memuat | Tombol "berguna" dan "tidak berguna" |
| Toast | Satu kalimat dan satu aksi opsional | Info, berhasil, perlu dicek, galat | Hilang sendiri setelah 4 detik kecuali galat |
| Keadaan kosong | Ilustrasi Nala, satu kalimat, satu tombol | - | Contoh teks ada di bagian Suara dan gaya bahasa |

**Token untuk Tailwind CSS v4**

```css
@theme {
  --color-pn-teal-700: #0B6B6B; --color-pn-teal-800: #085252; --color-pn-teal-100: #D8EFEE;
  --color-pn-amber-500: #F2A33A; --color-pn-amber-700: #9A5B00;
  --color-pn-ink-900: #14212B; --color-pn-ink-600: #4A5A66; --color-pn-ink-400: #8494A0;
  --color-pn-kertas: #F7F5F0;
  --color-pn-grup-biru: #1F5FA8; --color-pn-grup-oranye: #A04E00;
  --color-pn-grup-hijau: #0F7A5A; --color-pn-grup-ungu: #8A3F8C;
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-kelas: "Atkinson Hyperlegible", system-ui, sans-serif;
  --radius-kartu: 12px; --radius-tombol: 10px;
}
```

Wireframe per layar, peta layar, dan keadaan galat lengkap dikerjakan di tab UX dan Layar pada tahap 2.
