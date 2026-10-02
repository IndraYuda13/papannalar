# UX dan Layar

<!-- BEGIN PN_UI_AI_V2 -->
## Pembaruan seluruh route dan state

Gunakan [peta halaman dan motion](11_UI_BLUEPRINT.md) serta [tes Q01-Q10](13_EXECUTION_QA.md).
Perubahan mencakup masuk, beranda, kelas, editor, asesmen, hasil, controller,
latihan dan seluruh mode layar. QR/profil/reconnect/state lama tidak boleh hilang.
Library 3D tidak masuk scanner; fallback, reduced motion, keyboard dan status
belum tersinkron tetap bekerja. Ini arah baru, bukan laporan usability guru.
<!-- END PN_UI_AI_V2 -->

## Ringkasan

PapanNalar punya tiga permukaan, dan siswa berhadapan dengan dua: papan interaktif yang mereka lihat dan sentuh secara bergiliran, dan Kartu Nalar di tangan (kelas 1 sampai 3 menjawab lisan). Aplikasi Guru di HP adalah satu-satunya tempat nama, level, dan saran tampil.

| Permukaan | Dipakai di | Tugas UX utama | Artboard di kanvas |
| --- | --- | --- | --- |
| Layar Kelas | Papan interaktif, proyektor, atau TV | Terbaca dari bangku paling belakang; satu hal per layar; bisa disentuh dua siswa sekaligus tanpa saling mengganggu; tidak pernah menampilkan nama atau level | Layar-Pembuka, Layar-Soal, Layar-SD5, Layar-SMA10, Layar-Kelompok, Layar-Stasiun, Layar-Berdua, Layar-CariKesalahan, Layar-Timbangan, Layar-Grafik, Layar-DuaTingkat, Layar-Refleksi, Layar-TesPapan, Layar-Panel, Layar-Sorot |
| Kartu Nalar | Tangan siswa kelas 4 ke atas | Bisa diisi tanpa penjelasan panjang; terbaca mesin walau hasil fotokopi | Kartu-Nalar |
| Aplikasi Guru | HP guru | Maksimal 3 ketukan untuk mulai sesi; bisa dipakai sambil berdiri dengan satu tangan | HP-Beranda, HP-Pindai, HP-Kelompok, HP-Stasiun, HP-Bisik, HP-CekLisan, HP-Kemajuan |

Kanvas [PapanNalar: Desain Layar](https://claude.ai/artifact/UZtew2V4EFFa94LpKqULdj) memakai data contoh yang saling nyambung: kelas 7B berisi 32 siswa, kartu absen 07 yang dipindai di HP sama dengan kartu di artboard Kartu Nalar, dan tiga kelompok di HP sama dengan yang tampil di Layar Kelas. Developer bisa memakai angka itu sebagai data seed.

## Pengalaman siswa dalam satu sesi

Siswa hanya perlu memahami empat hal: nomor absennya, bentuk kelompoknya, stasiun tempat kelompoknya berada, dan nomor baris di kartu. Peran Pilot dan Navigator ditampilkan papan dengan nomor absen, jadi siswa tidak perlu menghafal giliran. Keputusan desain di bawah menjaga agar daftar ini tetap empat. Contoh memakai SMP (80 menit) sesuai diagram alur di PRD. Di sesi pertama, cek level berisi 10 soal dan memakan sekitar 13 menit.

| Menit | Yang dilihat siswa | Yang dilakukan siswa | Keputusan desain |
| --- | --- | --- | --- |
| 0 sampai 5 | Pembuka Bermakna: masalah nyata (lift dari B2 ke lantai 5) dan tujuan hari ini di pita atas | Menulis tebakan di buku; dua Pilot menyeret penanda tebakan ke garis bilangan tegak | Tebak dulu sebelum menghitung, supaya siswa punya alasan ingin tahu jawabannya. Hasil tampil di samping tebakan tanpa skor |
| 5 sampai 12 | Soal cek level, satu per layar, dengan timer | Menulis nomor absen di kotak, menghitamkan gelembungnya, lalu satu jawaban per soal | Layar selalu menyebut barisnya ("Hitamkan jawabanmu di Kartu Nalar, baris 3"). Pilihan "?" bergaris putus-putus dengan kalimat "tidak apa-apa, ini bukan ujian" supaya siswa tidak menebak |
| 12 sampai 16 | Pertanyaan lanjutan pembuka dengan gambar gedung | Mengerjakan di buku selagi guru memindai kartu | Pertanyaan bisa dijawab sederhana atau diperluas, jadi semua level punya pekerjaan. Tidak ada kunci atau skor di layar, supaya siswa tidak mengubah isi kartunya |
| 16 sampai 18 | Kartu kelompok: bentuk, warna, nomor absen, stasiun pertama, dan topik hari ini | Mencari nomor absennya, lalu pindah ke stasiunnya | Nomor absen dua digit berukuran besar. Tiap kelompok punya bentuk dan warna, jadi siswa yang buta warna tetap bisa membedakan. Timer "Pindah dalam" memberi batas yang jelas |
| 18 sampai 66 | Mode Stasiun: di kiri Alat Nalar untuk kelompok di papan, di kanan Papan Tugas Mandiri, di atas timer "Pindah dalam" | Tiga putaran. Di Stasiun Papan menjadi Pilot, Navigator, atau penebak di buku; di Stasiun Guru berdiskusi dengan guru; di Stasiun Mandiri mengerjakan soal konteks dan Cari Kesalahan dari lembar tugas | Papan menampilkan nomor absen Pilot dan Navigator, jadi giliran jelas tanpa nama. Tidak ada tanda silang atau bunyi salah; petunjuk dibuka bertahap |
| 66 sampai 74 | Kartu keluar dua tingkat di panel tiap kelompok, satu baris per layar | Mengisi baris 1 (soal), baris 2 (alasan), dan baris 3 (soal konteks) di Kartu Keluar | Tampilannya sama dengan cek level. Pilihan alasan ditulis pendek supaya terbaca dari bangku |
| 74 sampai 80 | Layar Refleksi: tiga kalimat rumpang dan daftar kegunaan yang ditemukan hari ini | Menulis tiga kalimat di buku; tiga siswa menulis di zona tulis papan | Zona tulis tidak disimpan. Guru menutup dengan mengaitkan kegunaan dari tiap kelompok |

Yang tidak pernah dilihat siswa di layar: nama siswa, kode atau angka level, peringkat, dan skor benar-salah per siswa. Di kelas 1 sampai 3, siswa tidak mengisi kartu: guru memanggil satu per satu dan membacakan soal, sementara siswa lain mengerjakan lembar aktivitas bergambar.

## Prinsip visual per usia

Makin muda siswanya, makin konkret gambarnya. Urutannya mengikuti pendekatan konkret, gambar, lalu simbol: siswa melihat model dulu, baru angka. Jenjang ditentukan dari kelas, sedangkan jenis model ditentukan dari anak tangga soalnya, jadi siswa kelas 7 yang bekerja di C3 tetap mendapat model batang pecahan.

| Jenjang | Representasi utama | Kepadatan layar | Contoh di kanvas |
| --- | --- | --- | --- |
| SD kelas 1 sampai 3 | Benda dan gambar benda (jari, stik, kue). Soal dibacakan guru | Satu soal, gambar besar, teks paling banyak 6 kata | HP-CekLisan |
| SD kelas 4 sampai 6 | Gambar model: batang pecahan, garis bilangan, blok nilai tempat. Simbol di bawah gambar | Paling banyak 2 baris teks; setiap soal punya gambar | Layar-SD5 |
| SMP | Model sebagai jembatan ke simbol: garis bilangan untuk bilangan bulat, batang untuk pecahan, tabel untuk rasio | Simbol besar; model di Alat Nalar yang disentuh siswa | Layar-Soal, Layar-Stasiun, Layar-Berdua, Layar-CariKesalahan |
| SMA | Simbol, tabel nilai, dan grafik fungsi | Boleh 2 sampai 3 baris; grafik yang bisa digeser untuk soal fungsi | Layar-SMA10 |

**Aturan yang sama di semua jenjang:** teks soal Atkinson Hyperlegible minimal 56 px pada layar 1920 x 1080; tanda minus U+2212; pecahan ditulis bertumpuk; desimal memakai koma; satu soal per layar; pilihan A sampai D dalam lingkaran teal dan pilihan "?" bergaris putus-putus; objek yang diseret minimal 88 px dan tombol minimal 96 px.

**Kapan memakai 3D.** Tampilan isometrik dipakai untuk pengenalan: tangga di artboard Main, suasana kelas di Ilustrasi-Kelas dan Ilustrasi-Stasiun, Panduan Guru, dan materi pitch. Soal, model matematika, dan grafik kemajuan selalu datar. Perspektif membuat bagian yang sama besar tampak berbeda ukuran, padahal di soal pecahan siswa justru diminta membandingkan ukuran. Sudut miring juga lebih sulit dibaca dari bangku belakang.

**Gerak.** Transisi antarmode sekitar 200 ms. Di Alat Nalar, gerak adalah bagian dari penjelasan: lompatan Nala di garis bilangan dan timbangan yang miring dianimasikan langkah demi langkah, sekitar 300 ms per langkah, dan bisa diulang. Tidak ada animasi atau suara saat siswa menjawab cek level atau kartu keluar. Maskot Nala mengikuti aturan di tab Brand: tidak muncul di layar cek level.

## Peta layar

&#91;embedded content: peta layar · 10 tahap, HP guru dan Layar Kelas\]

Kelas 1 sampai 3 melewati tahap Cek level dan Pindai di minggu biasa: kelompok memakai hasil cek lisan terakhir, dan di Stasiun Guru guru menanyakan satu soal dan satu "kenapa?" kepada tiap siswa. Cek lisan penuh punya pertemuan sendiri di awal, tengah, dan akhir semester. Setiap perubahan mode di Layar Kelas berasal dari HP guru atau dari tombol guru di papan; sentuhan siswa hanya mengubah Alat Nalar di mode yang sedang dibuka. Layar Kelas tidak menyimpan data siswa; ia hanya memutar Paket Sesi yang tersimpan dan perintah dari HP.

## Spesifikasi layar

Setiap layar punya satu tombol utama. Layar yang belum digambar di kanvas mengikuti komponen di tab Brand dan pola layar di sebelahnya.

**Aplikasi Guru (HP, 390 x 844)**

| Layar | Tujuan | Isi utama | Aksi utama | Fitur | Artboard |
| --- | --- | --- | --- | --- | --- |
| Masuk | Masuk tanpa kata sandi | Kolom email | Kirim tautan masuk | F1 | Belum digambar |
| Beranda | Tahu sesi berikutnya dan mulai dalam satu ketukan | Kartu sesi berikutnya dengan status Paket Sesi; daftar kelas dengan batang sebaran level | Mulai sesi | F1, F3 | HP-Beranda |
| Kelas dan Siswa | Membuat dan mengatur kelas | Nama rombel, tingkat kelas 1 sampai 12, jumlah siswa, target anak tangga (terisi otomatis dari tingkat kelas), cara cek (kartu atau lisan), impor nama dari CSV | Simpan kelas; Cetak Kartu Nalar (PDF) | F1, F2 | Belum digambar |
| Paket Sesi | Memeriksa materi sebelum kelas | Jendela cek, masalah pembuka, soal cek level, tugas stasiun per anak tangga, kartu keluar dua tingkat; label "cerita ditulis LLM, angka diperiksa kode" pada soal bercerita | Ganti soal (satu ketukan) | F3 | Belum digambar |
| Pasangkan Layar | Menyambungkan HP dengan Layar Kelas | Kolom kode 6 digit dan status sambungan | Sambungkan; Lewati dan bacakan dari HP | F4 | Belum digambar |
| Kendali Sesi | Menjadi remote Layar Kelas | Mode yang sedang tampil, timer, tombol Kembali dan Lanjut selebar layar | Lanjut | F4 | Belum digambar |
| Pindai Kartu | Membaca 32 kartu dalam sekitar 2 menit | Kamera dengan sudut panduan, toast "Absen 07 terbaca", progres, daftar kartu yang perlu dicek | Selesai pindai; Pilih jawaban | F5 | HP-Pindai |
| Cek Lisan | Mengecek siswa kelas 1 sampai 3 satu per satu | Tangga kecil dengan posisi siswa, soal, kalimat baca, kunci, pilihan jawaban salah | Benar; Salah; Diam atau belum tahu | F16 | HP-CekLisan |
| Kelompok | Memeriksa kelompok sebelum ditampilkan | Tiap kelompok: bentuk, warna, kode anak tangga, jumlah siswa, miskonsepsi terbanyak, nomor absen | Tampilkan di Layar Kelas; tahan nomor untuk memindah | F6 | HP-Kelompok |
| Kendali Stasiun | Menjalankan rotasi tiga stasiun dan giliran di papan | Stasiun tiap kelompok di putaran ini, timer, tugas yang sedang di papan, nomor Pilot dan Navigator, petunjuk yang sudah dibuka, tanda "Navigator dulu" | +3 menit; Akhiri putaran; Ganti peran; Tunjukkan jawaban (dengan konfirmasi) | F17, F18 | HP-Stasiun |
| Bisik | Saran saat mendampingi satu kelompok | Jawaban siswa dan jawaban seharusnya, 3 pertanyaan pemantik, peragaan, cek cepat, kolom tanya | Kirim pertanyaan; tandai berguna | F7 | HP-Bisik |
| Kemajuan | Melihat perpindahan level per minggu | Batang bertumpuk per minggu, persentase benar dan paham per anak tangga, miskonsepsi yang bertahan, siswa yang belum naik 3 sesi | Bagikan ringkasan ke wakasek | F9, F10 | HP-Kemajuan |
| Detail Siswa | Menjawab "kenapa di level ini" | Jawaban per soal per sesi, riwayat level, catatan pemindahan | Pindahkan; Cek lisan | F6, F13 | Belum digambar |

**Layar Kelas (1920 x 1080)**

| Mode | Kapan | Isi | Aturan | Artboard |
| --- | --- | --- | --- | --- |
| Pasangan | Saat halaman pertama dibuka | Logo, kode 6 digit besar, kalimat "Masukkan kode ini di HP guru" | Kode baru setiap kali dibuka | Belum digambar |
| Tes Kemampuan Papan | Pertama kali papan dipakai, atau dari menu | Enam langkah: satu sentuhan, dua sentuhan, empat sentuhan, browser dan layar (otomatis), kelancaran, tinggi papan | Sekitar 1 menit; hasilnya menentukan cadangan tiap pola | Layar-TesPapan |
| Pembuka | Menit 0 sampai 5 | Masalah nyata, "Tebak dulu", strip penanda tebakan, model (lift, martabak, atau paket internet), tujuan hari ini | Dua Pilot menaruh penanda; hasil tampil setelah "Jalankan" | Layar-Pembuka |
| Soal | Cek level | Nomor soal, titik progres, timer, soal, pilihan A sampai D dan "?", baris kartu | Teks soal minimal 56 px; timer bawaan 75 detik, 80 detik untuk SD | Layar-Soal, Layar-SD5, Layar-SMA10 |
| Lanjutan | Selama guru memindai | Pertanyaan lanjutan pembuka dengan gambar | Tanpa kunci dan tanpa skor | Belum digambar |
| Kelompok | Setelah pindai | Kartu kelompok: bentuk, warna, nomor absen, stasiun pertama, topik hari ini; timer pindah tempat | Tanpa nama dan tanpa level | Layar-Kelompok |
| Stasiun | Rotasi stasiun | Dua pertiga kiri: Alat Nalar kelompok di papan, nomor Pilot dan Navigator, tombol Petunjuk, Ulang langkah, dan Jalankan. Sepertiga kanan: Papan Tugas Mandiri | Objek seret minimal 88 px, tombol 96 px; teks tugas mandiri minimal 40 px; di SD yang disentuh ada di dua pertiga bawah layar | Layar-Stasiun, Layar-CariKesalahan, Layar-Timbangan, Layar-Grafik |
| Berdua | Tugas "Dua Cara" di Stasiun Papan | Papan dibagi dua; Siswa A dan B memakai model berbeda untuk soal yang sama; kotak perbandingan di tengah | Hanya di papan yang lolos tes dua sentuhan; tanpa lomba waktu | Layar-Berdua |
| Panel Terbagi | Varian singkat 1 jam pelajaran | 2 sampai 4 panel; tiap panel memuat bentuk kelompok, model visual, dan latihan ke berapa | Soal panel minimal 72 px, label minimal 26 px | Layar-Panel |
| Sorot | Guru menjelaskan satu contoh ke seluruh kelas | Contoh terbimbing langkah demi langkah, model visual, "Coba sendiri", kesalahan yang sering terjadi | Satu contoh memenuhi layar; kesalahan yang dibahas ditulis sebagai milik Nala; mode lain tetap tersimpan | Layar-Sorot |
| Kartu Keluar | Menit 66 sampai 74 (contoh SMP) | Tiga baris per kelompok: soal, alasan, soal konteks; satu baris per layar | Soal minimal 56 px, pilihan alasan minimal 40 px dan paling banyak 8 kata; tanpa timer per soal | Layar-DuaTingkat |
| Refleksi | Menit 74 sampai 80 | Tiga kalimat rumpang, zona tulis tangan, daftar kegunaan hari ini | Zona tulis tidak disimpan dan dibersihkan saat sesi ditutup | Layar-Refleksi |

Tombol Kembali dan Lanjut (minimal 96 px) muncul di pojok bawah Layar Kelas saat papan disentuh, lalu hilang lagi setelah 5 detik, sehingga sesi tetap bisa jalan tanpa HP. Di mode yang memang disentuh siswa (Pembuka, Stasiun, Berdua, Refleksi), tombol itu hanya muncul dengan menahan pojok kiri bawah selama 2 detik, supaya sentuhan Pilot tidak memindah mode. Karena itu tombol ini tidak tampak di artboard.

## Keadaan kosong, memuat, galat, dan tanpa internet

Setiap keadaan menjawab dua pertanyaan guru: apa yang terjadi, dan apa yang bisa dilakukan sekarang. Kalimatnya tidak menyalahkan guru atau siswa.

| Situasi | Tempat | Teks | Aksi |
| --- | --- | --- | --- |
| Belum ada kelas | Beranda (dengan Nala) | Belum ada kelas. Buat kelas pertama dalam satu menit. | Buat kelas |
| Paket Sesi belum disiapkan | Beranda | Paket Sesi belum disiapkan. | Siapkan sekarang |
| Paket disiapkan tanpa internet | Paket Sesi | Tanpa internet: soal dibuat dari templat, tanpa cerita. | Tidak ada |
| Layanan LLM gangguan | Paket Sesi | Cerita soal tidak tersedia. Soal tetap siap tanpa cerita. | Tidak ada |
| Layar belum tersambung | Pasangkan Layar | Layar Kelas belum tersambung. Pastikan HP dan papan sama-sama tersambung ke internet. | Coba lagi; Bacakan dari HP |
| Sambungan putus di tengah sesi | Kendali Sesi | Sambungan ke layar terputus. Layar tetap menampilkan mode terakhir. | Sambung ulang |
| Kartu buram | Pindai | Kartu buram. Tahan HP sedikit lebih diam. | Otomatis mencoba lagi |
| Kartu gagal dibaca 2 kali | Pindai | Kartu belum terbaca. Isi jawabannya secara manual? | Isi manual |
| Jawaban ganda | Pindai | Absen 12 perlu dicek. Baris 3 terisi dua: A dan C. | Pilih jawaban |
| Nomor absen sudah dipindai | Pindai | Absen 07 sudah dipindai. Ganti dengan kartu ini? | Ganti; Lewati |
| Nomor absen tidak ada di kelas | Pindai | Absen 35 tidak ada di kelas 7B. Nomor mana yang benar? | Pilih nomor |
| Tanpa internet | Semua layar HP | Tidak ada internet. Pemindaian tetap jalan dan akan disinkronkan nanti. | Tidak ada |
| Bisik tanpa internet | Bisik | Tanpa internet: menampilkan kartu strategi yang tersimpan. | Tidak ada |
| Bisik sedang menyusun | Bisik | Bisik sedang menyusun saran. | Batal |
| Siswa terlalu sedikit untuk 3 kelompok | Kelompok | Kelas ini cukup dibagi 2 kelompok. | Tidak ada |
| Semua siswa di anak tangga yang sama | Kelompok | Semua siswa di anak tangga yang sama. Kelas dibagi 3 kelompok acak dengan tugas yang sama, supaya rotasi tetap jalan. | Tidak ada |
| Kemajuan belum ada | Kemajuan (dengan Nala) | Kemajuan muncul setelah dua sesi. | Tidak ada |
| Gelembung terlalu samar | Pindai | Absen 09 perlu dicek. Baris 2 kurang jelas. | Pilih jawaban |
| Papan tidak mendukung sentuhan | Tes Kemampuan Papan | Papan ini belum bisa disentuh. Alat Nalar dijalankan dari HP guru, dan siswa memberi arahan. | Lanjut |
| Papan hanya membaca satu sentuhan | Tes Kemampuan Papan | Papan ini membaca satu sentuhan. Pilot bergantian, dan mode Berdua tidak dipakai. | Lanjut |
| Waktu putaran habis sebelum tugas papan selesai | Kendali Stasiun | Waktu putaran 2 habis. Segitiga Biru baru menyelesaikan 2 dari 3 tugas papan. | Tambah 3 menit; Pindah sekarang |

Toast hilang sendiri setelah 4 detik, kecuali galat. Semua kalimat di atas memakai istilah dari tab Brand: "cek level", bukan "tes"; "belum menguasai", bukan "gagal".

## Aksesibilitas dan uji kegunaan

Desain dianggap selesai setelah lolos uji di ruang kelas nyata.

- [ ] Semua pasangan teks dan latar lolos kontras WCAG 2.1 AA, termasuk chip nomor absen berwarna muda di HP Kelompok
- [ ] Area sentuh di HP minimal 48 x 48 px; chip nomor absen yang tampak 34 x 28 px mendapat padding sentuh
- [ ] Area sentuh di papan: objek seret minimal 88 px dan tombol minimal 96 px pada layar 1920 x 1080; di SD semua yang disentuh ada di dua pertiga bawah layar
- [ ] Informasi tidak hanya lewat warna: kelompok punya bentuk dan nama, status punya ikon dan teks
- [ ] Semua tombol ikon punya label aksesibel; teks HP tetap utuh saat ukuran huruf sistem dinaikkan ke 130%
- [ ] Tanda minus memakai U+2212 dan pecahan bertumpuk di semua layar (uji otomatis pada keluaran generator soal)
- [ ] Siswa dengan hambatan gerak atau penglihatan bisa menjadi Navigator atau menjalankan Alat Nalar dari HP guru; objek bisa diperbesar 1,5 kali

| Uji | Peserta | Tugas | Lulus bila |
| --- | --- | --- | --- |
| Jarak baca | Satu kelas di tiap jenjang, siang hari | Siswa bangku paling belakang membacakan soal dan pilihan | Semua terbaca tanpa maju |
| Pengisian kartu | Satu kelas 4 | Mengisi Kartu Nalar setelah satu kali contoh di layar | Metrik di PRD tercapai; kalau tidak, kelas 4 memakai cek lisan |
| Mencari kelompok | Satu kelas SMP | Pindah ke kelompok setelah Layar Kelompok tampil | Semua siswa duduk di kelompoknya sebelum timer habis |
| Guru baru | 3 guru yang belum pernah melihat aplikasi | Membuat kelas, memindai 10 kartu, menampilkan kelompok | Selesai tanpa bantuan tim |
| Cek lisan | Satu kelas 2 SD | Mengecek 10 siswa | Rata-rata sekitar 1 menit per siswa |
| Menyentuh Alat Nalar | Satu kelas SD 5 dan satu kelas SMP | Dua Pilot menyelesaikan satu tugas Tebak Dulu tanpa bantuan guru | Selesai dalam 5 menit; tidak ada objek yang direbut atau pindah mode tanpa sengaja |
| Rotasi stasiun | Satu kelas SMP | Menjalankan tiga putaran penuh | Setiap perpindahan selesai dalam jeda 1 menit |
| Membaca Papan Tugas Mandiri | Kelompok di bangku paling jauh dari papan | Membacakan tugas 1 sampai 3 | Ringkasan terbaca tanpa maju; tugas lengkap tetap ada di lembar cetak |
