# PRD PapanNalar

## 1. Latar dan pernyataan masalah

**Pernyataan masalah:** guru yang mengajar matematika, dari SD kelas 1 sampai SMA, menghadapi satu kelas yang kemampuan siswanya terpaut beberapa tingkat kelas. Tidak ada cara cepat untuk mengetahui level tiap siswa dan mengajar sesuai level itu, sehingga siswa yang tertinggal terus tertinggal dan kesenjangannya terbawa dari SD ke SMP lalu ke SMA. Di saat yang sama, papan interaktif yang sudah dikirim ke sekolah baru dipakai seperti proyektor.

| Bukti | Sumber |
| --- | --- |
| PISA 2025: skor matematika Indonesia 364; hanya 17% siswa mencapai Level 2, rata-rata OECD 65%. Rerata TKA SMA 2025 matematika 36,10 dari 100 | [Puslapdik](https://puslapdik.kemendikdasmen.go.id/pisa-2025-skor-indonesia-meningkat-di-sains-dan-membaca-namun-turun-di-matematika/), [The Jakarta Post](https://www.thejakartapost.com/opinion/2026/09/18/reading-the-pisa-scores-and-what-should-follow), [Bloomberg Technoz](https://www.bloombergtechnoz.com/detail-news/94420/nilai-rata-rata-anak-sma-ri-dari-hasil-tka-2025-matematika-36-10) |
| Kemampuan numerasi rata-rata siswa kelas 7 tahun 2014 setara kelas 4 tahun 2000 | [Beatty dkk., 2021](https://riseprogramme.org/publications/schooling-progress-learning-reversal-indonesias-learning-profiles-between-2000-and.html) |
| Kurikulum yang lebih cepat dari kemampuan siswa membuat yang tertinggal terus tertinggal | [Pritchett dan Beatty](https://www.hks.harvard.edu/sites/default/files/centers/cid/files/publications/faculty-working-papers/243_Pritchett.pdf) |
| Rapor Pendidikan 2025: capaian numerasi SD 59,45% dan SMP 70,81%; agenda perbaikan menekankan pembelajaran berdiferensiasi dan asesmen formatif | [ANTARA](https://www.antaranews.com/berita/5613041/kemendikdasmen-rilis-rapor-pendidikan-2025-rujukan-kualitas-pendidikan), [PSKP Kemendikdasmen](https://pskp.kemendikdasmen.go.id/file/kebijakan/1767151837_file.pdf) |
| 288.865 satuan pendidikan, dari PAUD, SD, SMP, SMA, SMK sampai SLB, menerima papan interaktif; di Kaltim sekitar 3.900 unit, dipakai sebatas presentasi, YouTube, dan kuis sederhana | [BBPMP Jabar](https://bbpmpjabar.kemendikdasmen.go.id/percepat-transformasi-pendidikan-presiden-luncurkan-digitalisasi-pembelajaran-untuk-288-ribu-sekolah/), [Medcom](https://www.medcom.id/pendidikan/news-pendidikan/nbw5oRRK-bikin-siswa-lebih-paham-288-ribu-sekolah-terima-papan-interaktif-digital), [Kaltim Faktual](https://kaltimfaktual.co/bukan-sekadar-pajangan-guru-di-kukar-dilatih-maksimalkan-papan-digital/) |
| Perangkat keras tanpa perubahan pendukung tergolong "bad buy" | [GEEAP](https://geeap.org/cost-effective-approaches-to-improve-global-learning-what-does-recent-evidence-tell-us-are-smart-buys-for-improving-learning-in-low-and-middle-income-countries/) |

**Kenapa SD sampai SMA, bukan satu jenjang:** kesenjangan numerasi dimulai di SD lalu terbawa naik. Data RISE menunjukkan kemampuan numerasi rata-rata siswa kelas 7 tahun 2014 setara siswa kelas 4 tahun 2000, jadi produk yang baru hadir di SMP datang terlambat, dan produk yang berhenti di SD tidak menolong siswa yang sudah telanjur tertinggal. Bukti RCT paling kuat ada di SD ([TaRL, GEEAP](https://geeap.org/cost-effective-approaches-to-improve-global-learning-what-does-recent-evidence-tell-us-are-smart-buys-for-improving-learning-in-low-and-middle-income-countries/)) dan SMP (Mindspark, siswa kelas 6 sampai 9, [J-PAL](https://www.povertyactionlab.org/evaluation/disrupting-education-evidence-technology-aided-instruction-india)). Untuk SMA kami memakai logika yang sama pada prasyarat aljabar; ini belum punya bukti langsung, jadi ditulis sebagai asumsi.

**Kenapa alur lengkap di demo memakai SMP kelas 7:** di kelas 7 kesenjangan dari SD paling terlihat, dan contohnya paling dekat dengan bukti Mindspark. Layar SD kelas 5 dan SMA kelas 10 di kanvas desain menunjukkan mesin yang sama di jenjang lain.

**Kenapa fokus pada pemahaman, bukan hafalan:** PISA mendefinisikan literasi matematika sebagai kemampuan menalar serta merumuskan, memakai, dan menafsirkan matematika untuk memecahkan masalah dalam berbagai konteks nyata ([OECD, PISA 2022 Mathematics Framework](https://pisa2022-maths.oecd.org/)). Kebijakan Pembelajaran Mendalam Kemendikdasmen (2025) juga meminta belajar yang berkesadaran, bermakna, dan menggembirakan. Karena itu setiap anak tangga punya konteks nyata dan kegunaannya, siswa memanipulasi model di papan, dan kartu keluar menanyakan alasan, bukan hanya jawaban. Rinciannya di tab Desain Pembelajaran Interaktif.

**Kenapa sekarang:** hasil PISA 2025 baru rilis 8 September 2026, 800.000 papan interaktif tambahan diumumkan Juli 2026 ([ANTARA Jogja](https://jogja.antaranews.com/berita/839237/mendikdasmen-tambah-800000-papan-interaktif-digital-di-sekolah)), dan Rapor Pendidikan 2025 menuntut pembelajaran berdiferensiasi.

## 2. Tujuan, non-tujuan, dan metrik

**Tujuan produk**

| Kode | Tujuan | Menjawab |
| --- | --- | --- |
| G1 | Guru mengetahui level tiap siswa dalam sekitar 10 menit di sesi mingguan (jadwal menyediakan 11 menit: cek 7, pindai 4; sesi pertama sekitar 17 menit; cek lisan penuh kelas 1 sampai 3 memakai satu pertemuan tersendiri) | Tidak ada cara cepat mengetahui level siswa |
| G2 | Guru menjalankan pembelajaran per kelompok level di satu layar kelas tanpa menyiapkan materi sendiri | Beban persiapan pembelajaran berdiferensiasi |
| G3 | Guru mendapat saran mengajar yang spesifik saat mendampingi satu kelompok | Guru dituntut berdiferensiasi tanpa pendampingan |
| G4 | Perpindahan level tiap siswa terlihat dari minggu ke minggu | Siswa tertinggal tidak terpantau |
| G5 | Berjalan tanpa HP siswa dan di perangkat yang sudah ada di sekolah | Papan interaktif menganggur; siswa tidak punya perangkat |
| G6 | Siswa memahami konsep dan tahu gunanya: mereka memanipulasi model di papan, menjelaskan alasan, dan menuliskan kegunaan yang mereka temukan, bukan menghafal prosedur | Papan interaktif dipakai pasif (M5); siswa lemah memakai matematika di situasi nyata (M1) |

**Non-tujuan (sengaja tidak dikerjakan)**

- Bukan pengganti guru dan bukan aplikasi ujian. Hasil PapanNalar tidak dipakai untuk nilai rapor. Bukan pula latihan soal ujian: tidak ada bank soal ujian, latihan berwaktu, skor, atau peringkat di papan.
- Tidak ada peringkat siswa dan tidak ada chatbot untuk siswa di MVP.
- Tidak membaca tulisan tangan di MVP.
- Di MVP tidak mencakup mapel selain matematika, PAUD, SLB, elemen di luar Bilangan dan Aljabar (pengukuran, geometri, analisis data), serta materi Fase F (SMA kelas 11 dan 12). Kelas 11 dan 12 tetap bisa memakai tangga sampai Fase E sebagai cek prasyarat.

**Metrik keberhasilan**

| Jenis | Metrik | Target MVP | Cara ukur |
| --- | --- | --- | --- |
| Produk | Akurasi pembacaan jawaban di Kartu Nalar | Target 99% per jawaban pada set uji; angka final dari hasil ukur | 30 kartu uji dengan jawaban diketahui, difoto di 3 kondisi cahaya |
| Produk | Waktu pindai per kartu | Target maksimal 3 detik | Log waktu di aplikasi |
| Produk | Waktu dari kartu terakhir dipindai sampai kelompok tampil di layar | Target maksimal 5 detik | Log waktu |
| Produk | Soal dengan kunci salah yang lolos ke kelas | 0 | Uji otomatis atas 500 soal hasil generator |
| Produk | Waktu respons Bisik | Target maksimal 5 detik saat online | Log waktu |
| Belajar (uji 4 minggu, setelah lomba) | % siswa naik minimal satu anak tangga dalam 4 minggu | Diukur, bukan diklaim; tanpa kelas pembanding bukan bukti sebab-akibat | Data level per sesi |
| Adopsi (uji coba) | Sesi per guru per minggu; % sesi yang selesai sampai kartu keluar | Diukur | Log sesi |
| Pengaman | Nama siswa di layar kelas atau di prompt LLM | 0 kejadian | Audit log dan uji otomatis |
| Produk | Waktu cek lisan per siswa (SD kelas 1 sampai 3) | Target sekitar 1 menit | Log waktu per siswa di aplikasi |
| Produk | Siswa kelas 4 yang mengisi Kartu Nalar dengan benar tanpa bantuan | Diukur; kalau di bawah 90%, kelas 4 memakai cek lisan | Uji di satu kelas 4 dengan lembar latihan |
| Produk | Jeda dari sentuhan siswa sampai Alat Nalar berubah | Target di bawah 0,5 detik | Log waktu di Layar Kelas pada papan uji |
| Produk | Pemerataan giliran Pilot di papan | Target: semua siswa pernah menjadi Pilot dalam 3 sesi (4 sesi di papan satu sentuhan) | Log giliran per nomor absen. Simulasi awal dengan 2 Pilot per tugas, 3 tugas per putaran, kelompok 7, 13, dan 12, serta 5% absen (500 kelas): 97% kelas dalam 3 sesi; dengan 1 Pilot per tugas: 91% kelas dalam 4 sesi |
| Belajar (uji 4 minggu, setelah lomba) | Persentase "benar dan paham" per anak tangga: jawaban dan alasan di kartu keluar sama-sama benar | Diukur dan dibandingkan antarminggu; bukan nilai rapor | Kartu keluar dua tingkat |

## 3. Pengguna dan kondisi kelas

Pengguna utama adalah guru di tiga jenjang. Siswa tidak memegang perangkat pribadi: mereka menyentuh papan interaktif secara bergiliran di Stasiun Papan, mengisi Kartu Nalar (kelas 4 ke atas) atau menjawab lisan kepada guru (kelas 1 sampai 3), dan menulis di buku.

| Peran | Contoh (ilustrasi) | Tujuan | Masalah hari ini | Yang dipakai di PapanNalar |
| --- | --- | --- | --- | --- |
| Guru kelas SD (utama) | Bu Sari, guru kelas 2 di SD negeri di Samarinda, 28 siswa, mengajar semua mapel | Semua siswa lancar berhitung sebelum naik kelas | Tidak sempat menguji siswa satu per satu; buku teks berjalan satu kecepatan | Cek Lisan (kelas 1 sampai 3), Kartu Nalar (kelas 4 sampai 6), Layar Kelas bergambar, Bisik |
| Guru matematika SMP (utama) | Bu Rina, guru kelas 7 di SMP negeri di Samarinda, mengajar 4 rombel | Semua siswa maju, bukan hanya yang sudah bisa | Tidak tahu persis siapa tertinggal di mana; tidak sempat menyiapkan materi berbeda per kelompok | Aplikasi Guru di HP, Layar Kelas, Bisik |
| Guru matematika SMA (utama) | Pak Dani, guru kelas 10 di SMA negeri, mengajar 5 rombel | Siswa siap masuk materi kelas 10 seperti fungsi kuadrat dan eksponen | Siswa datang dengan prasyarat aljabar yang berbeda-beda, padahal materi kelas 10 dibangun di atasnya | Aplikasi Guru di HP, Layar Kelas, Bisik |
| Siswa | Kelas yang sebagian siswanya belum lancar operasi dasar, sebagian sudah siap materi kelasnya | Paham, tidak malu | Materi terlalu cepat atau terlalu mudah | Papan interaktif (Alat Nalar, bergiliran menjadi Pilot atau Navigator), Kartu Nalar, atau cek lisan |
| Wakasek kurikulum atau kepala sekolah | Menyiapkan rapat evaluasi dan laporan | Tahu kondisi numerasi per kelas | Rekap hanya berupa nilai, dari guru satu per satu | Ringkasan Kelas (web) |
| Dinas pendidikan (calon pembeli, bukan pengguna MVP) | Kabupaten atau kota untuk SD dan SMP; provinsi untuk SMA dan SMK | Papan interaktif yang dibagikan benar-benar dipakai | Tidak ada data pemanfaatan | Belum di MVP; dibahas di Rencana Bisnis |

**Kondisi nyata yang menjadi batasan desain**

| Kondisi | Dampak ke desain |
| --- | --- |
| Sekolah minimal menerima satu papan interaktif, belum tentu ada di setiap kelas ([Kaltim Faktual](https://kaltimfaktual.co/bukan-sekadar-pajangan-guru-di-kukar-dilatih-maksimalkan-papan-digital/)) | Layar Kelas harus jalan di browser apa pun, dan ada Mode Tanpa Layar berupa lembar cetak |
| Spesifikasi resmi papan yang dibagikan (ukuran, jumlah titik sentuh, versi browser) belum kami temukan di dokumen yang bisa dibuka | Tes Kemampuan Papan saat papan pertama dipakai (F20). Setiap pola interaksi punya cadangan, termasuk menjalankan Alat Nalar dari HP guru |
| Satu papan untuk 28 sampai 40 siswa | Rotasi tiga stasiun (F17): tiap kelompok mendapat satu giliran di papan per sesi. Di papan paling banyak 2 siswa menyentuh; anggota lain menjadi Navigator atau menebak di buku |
| Siswa SD kelas awal tidak menjangkau bagian atas papan, terutama papan yang menempel tinggi di dinding | Di SD, semua yang disentuh ada di dua pertiga bawah layar; tinggi papan ditanyakan di Tes Kemampuan Papan |
| Siswa tidak dianggap punya HP | Semua jawaban siswa lewat kertas atau lisan |
| Siswa kelas 1 sampai 3 SD belum lancar membaca dan mengisi lembar jawaban | Cek level lisan satu per satu dari HP guru (F16); Layar Kelas untuk SD selalu memakai gambar dan benda |
| Internet di kelas tidak dijamin (asumsi) | Pembacaan kartu dan perhitungan level berjalan di HP tanpa internet. Sinkron ke Layar Kelas butuh wifi atau hotspot HP guru. Cadangan di MVP: guru membacakan pembagian kelompok dari HP. Mode Satu Perangkat baru dibuat setelah MVP |
| Satu jam pelajaran lamanya 35 menit di SD, 40 menit di SMP, dan 45 menit di SMA | Alur sesi dirancang untuk 2 jam pelajaran (70, 80, atau 90 menit), dengan varian singkat 1 jam pelajaran |
| Di SD, guru kelas memegang hampir semua mapel; di SMP dan SMA, satu guru matematika mengajar beberapa rombel | Satu akun guru bisa punya banyak kelas dari jenjang berbeda; jenjang dan tingkat kelas menentukan target anak tangga bawaan |
| Guru sibuk dan tidak semua terbiasa dengan teknologi | Maksimal 3 ketukan untuk memulai sesi; semua materi disiapkan otomatis |
| Siswa di semua jenjang, terutama SMP dan SMA, peka terhadap label "kelompok bawah" | Nama kelompok berupa bentuk dan warna; level hanya terlihat di HP guru |
| Data siswa adalah data pribadi anak ([UU 27/2022 Pasal 25](https://pasal.id/peraturan/uu/uu-no-27-tahun-2022/pasal-25)) | Server hanya menyimpan ID acak dan nomor absen; nama siswa opsional dan hanya disimpan di perangkat guru |

## 4. Alur satu Sesi Tepat Level

Satu sesi memakai satu pertemuan 2 jam pelajaran: 70 menit di SD, 80 menit di SMP, 90 menit di SMA. Isinya tujuh fase: Pembuka Bermakna, cek level, pindai sambil siswa mengerjakan lanjutan pembuka, kelompok, rotasi tiga stasiun, kartu keluar dua tingkat, dan Refleksi. Diagram di bawah memakai contoh SMP; di SD dan SMA yang berubah hanya lama tiap putaran stasiun. Rincian tiap fase dan cara siswa berinteraksi dengan papan ada di tab Desain Pembelajaran Interaktif. LLM hanya bekerja di dua titik: menyiapkan materi sebelum kelas dan membisiki guru di Stasiun Guru. Semua langkah lain dikerjakan manusia atau kode biasa, jadi sesi tetap berjalan walau layanan AI sedang gangguan.

&#91;embedded content: alur Sesi Tepat Level · 7 fase, 4 peran, 80 menit\]

Lama tiap fase per jenjang (menit):

| Fase | SD (70) | SMP (80) | SMA (90) |
| --- | --- | --- | --- |
| Pembuka Bermakna | 5 | 5 | 5 |
| Cek level (5 soal) | 7 | 7 | 7 |
| Pindai dan lanjutan pembuka | 4 | 4 | 4 |
| Kelompok | 2 | 2 | 2 |
| Rotasi stasiun: 3 putaran dan 3 jeda pindah 1 menit | 36 (3 × 11 + 3) | 48 (3 × 15 + 3) | 57 (3 × 18 + 3) |
| Kartu keluar dua tingkat | 8 | 8 | 8 |
| Refleksi | 6 | 6 | 6 |
| Cadangan untuk guru | 2 | 0 | 1 |

Dengan 4 kelompok, rotasi berisi 4 putaran yang lebih pendek pada waktu total yang sama (F17). Pasangan Layar, Tes Kemampuan Papan (sekali per papan), dan pembagian Kartu Nalar dikerjakan sebelum bel. SMP tidak punya cadangan, jadi kalau guru menambah waktu putaran, Refleksi dipersingkat atau kartu keluar dikerjakan 5 menit di awal pertemuan berikutnya.

**Varian singkat** (1 jam pelajaran, contoh SMP 40 menit) tidak memakai rotasi: cek level 5 soal dengan timer 60 detik (5 menit); pindai sambil siswa menebak masalah pembuka di papan (3 menit); kelompok (2 menit); belajar per level dengan Panel Terbagi, dan hanya kelompok yang didampingi guru yang maju ke papan (22 menit); kartu keluar dua tingkat (6 menit); refleksi lisan (2 menit). Kartu yang dipakai tetap Cek Mingguan dan Kartu Keluar.

**Sesi pertama** memakai Cek Awal 10 soal dengan timer 75 detik, sekitar 13 menit atau 6 menit lebih lama dari cek mingguan. Karena itu tiap putaran stasiun dipotong 2 menit: 9 menit di SD, 13 menit di SMP, 16 menit di SMA.

**Kelas 1 sampai 3 SD** memakai alur yang sama dengan tiga perbedaan. Pertama, cek level dilakukan lisan satu per satu (F16) di awal, tengah, dan akhir semester dalam pertemuan tersendiri, sementara siswa lain mengerjakan lembar aktivitas umum bergambar dari Paket Sesi. Kedua, di minggu biasa tidak ada cek kelas dan pindai: Pembuka Bermakna (5 menit), kelompok dari level terakhir (2 menit), rotasi 3 × 17 menit dengan jeda (54 menit; Stasiun Mandiri memakai lembar bergambar dan benda, bukan teks di papan), dan Refleksi lisan (5 menit), sisa 4 menit. Ketiga, kartu keluar diganti cek lisan singkat di Stasiun Guru: satu soal dan satu pertanyaan "kenapa?" per siswa, sekitar 5 menit per kelompok, sehingga setiap kelompok tercek sekali tiap sesi.

**Kalau gagal di tengah jalan**

| Kejadian | Yang terjadi |
| --- | --- |
| Internet putus | Pembacaan kartu dan perhitungan level tetap jalan di HP. Layar Kelas memakai Paket Sesi yang sudah tersimpan. Guru membacakan pembagian kelompok dari HP, lalu menjalankan Mode Stasiun dengan tombol besar di layar sentuh |
| Layar kelas tidak tersedia | Mode Tanpa Layar: cetak lembar aktivitas per kelompok dari Paket Sesi |
| Kartu tidak terbaca | Aplikasi meminta foto ulang; setelah 2 kali gagal, guru memilih jawaban secara manual |
| Nomor absen ganda atau kosong | Aplikasi menandai kartu itu dan meminta guru memilih siswa yang benar |
| Layanan LLM gangguan | Paket Sesi memakai soal templat tanpa konteks cerita; Bisik menampilkan kartu strategi statis |
| Papan tidak mendukung sentuhan, atau hanya satu sentuhan | Hasil Tes Kemampuan Papan (F20) dipakai: Mode Berdua dimatikan dan Pilot bergantian. Tanpa sentuhan, Alat Nalar dijalankan dari HP guru seperti trackpad dan siswa memberi arahan lisan |
| Kelompok belum selesai saat timer pindah habis | Guru menambah 3 menit, mengakhiri putaran lebih cepat, atau menahan satu kelompok dari HP. Timer di papan ikut berubah |
| Lembar tugas mandiri belum dicetak | Kelompok membaca ringkasan di Papan Tugas Mandiri, dan guru membacakan tugasnya saat putaran dimulai |

## 5. Tangga Nalar dan logika pengelompokan

Tangga Nalar adalah satu tangga numerasi dari SD kelas 1 sampai SMA kelas 10: 22 anak tangga yang disusun menurut urutan prasyarat dan diambil dari elemen Bilangan dan Aljabar Capaian Pembelajaran Fase A sampai E ([Keputusan Kepala BSKAP 046/H/KR/2025](https://www.mtssmusliminbjp.sch.id/2025/08/cp-matematika-tahun-2025.html); ringkasan [Fase A sampai C](https://kepalasekolah.id/capaian-pembelajaran-cp-matematika-sd-mi-2025-terbaru-berdasarkan-keputusan-kepala-bskap-nomor-046-h-kr-2025/) dan [Fase E](https://kepalasekolah.id/cp-matematika-2025-fase-e-f-sma-ma-smk-mak/)). Tangga ini bukan salinan kurikulum: isinya keterampilan inti yang menjadi prasyarat materi kelas berikutnya. Siswa bekerja di anak tangga terendah yang belum ia kuasai, apa pun kelasnya.

### Tangga Nalar Fase A sampai E

| Kode | Fase (kelas) | Anak tangga | Contoh soal |
| --- | --- | --- | --- |
| A1 | A (1 sampai 2) | Bilangan sampai 20: membilang dan membandingkan | Mana lebih banyak, 12 atau 15? |
| A2 | A (1 sampai 2) | Tambah dan kurang sampai 20 | 8 + 5 = ? |
| A3 | A (1 sampai 2) | Bilangan sampai 100 dan nilai tempat | 47 = ... puluhan dan ... satuan |
| A4 | A (1 sampai 2) | Setengah dan seperempat | Kue dibagi 4 sama besar, 1 bagian dimakan. Berapa bagian yang dimakan? |
| B1 | B (3 sampai 4) | Nilai tempat sampai 10.000; tambah dan kurang sampai 1.000 | 356 + 278 = ? |
| B2 | B (3 sampai 4) | Perkalian dan pembagian sampai 100 | 42 : 6 = ? |
| B3 | B (3 sampai 4) | Kelipatan dan faktor | Faktor dari 12 adalah 1, 2, 3, 4, ..., ... |
| B4 | B (3 sampai 4) | Pecahan: makna, membandingkan, senilai | Berapa bagian yang diwarnai? (batang dibagi 4, 3 diwarnai) |
| C1 | C (5 sampai 6) | Operasi hitung sampai 100.000 | 1.248 : 4 = ? |
| C2 | C (5 sampai 6) | KPK dan FPB | KPK dari 4 dan 6 = ? |
| C3 | C (5 sampai 6) | Operasi pecahan dan pecahan campuran | 2/3 + 1/4 = ? |
| C4 | C (5 sampai 6) | Desimal dan rasio satuan | 3 pensil harganya Rp6.000. Berapa harga 1 pensil? |
| D1 | D (7 sampai 9) | Bilangan Bulat | 3 − 8 = ? |
| D2 | D (7 sampai 9) | Pecahan dan Desimal (bilangan rasional) | 1/2 + 1/3 = ? |
| D3 | D (7 sampai 9) | Rasio, Proporsi, dan Persen | 2 : 3 = 6 : ? |
| D4 | D (7 sampai 9) | Bentuk Aljabar | 3(x + 4) = ? |
| D5 | D (7 sampai 9) | Persamaan Linear Satu Variabel | 2x + 6 = 10, x = ? |
| D6 | D (7 sampai 9) | Fungsi Linear dan Sistem Persamaan Linear Dua Variabel | y = 2x + 1. Jika x = 3, y = ? |
| E1 | E (10) | Bilangan berpangkat, termasuk pangkat pecahan dan bentuk akar | 2³ × 2⁴ = 2 pangkat berapa? |
| E2 | E (10) | Sistem pertidaksamaan linear dua variabel | Apakah titik (1, 2) memenuhi x + y ≤ 4? |
| E3 | E (10) | Persamaan dan fungsi kuadrat | x² − 5x + 6 = 0, x = ? |
| E4 | E (10) | Persamaan dan fungsi eksponensial | 2ˣ⁺¹ = 16, x = ? |

D2 sengaja mengulang operasi pecahan dari Fase C, karena pecahan adalah prasyarat langsung bentuk aljabar. Pengukuran, geometri, dan analisis data belum masuk tangga di MVP.

### Target kelas dan cara cek

Setiap tingkat kelas punya target anak tangga bawaan. Guru boleh mengubahnya, karena alur tujuan pembelajaran tiap sekolah bisa berbeda. Siswa yang sudah menguasai semua anak tangga sampai target kelasnya masuk kelompok "Lanjut".

| Kelas | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 sampai 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Target bawaan | A2 | A4 | B2 | B4 | C2 | C4 | D5 | D6 | D6 | E4 | E4 (cek prasyarat) |
| Cara cek | Lisan | Lisan | Lisan | Kartu | Kartu | Kartu | Kartu | Kartu | Kartu | Kartu | Kartu |

Kelas 3 boleh dipindah ke Kartu Nalar oleh guru. Kelas 4 kembali ke cek lisan kalau uji pengisian kartu gagal (lihat metrik).

### Rincian Fase D dan miskonsepsi yang dilacak

Daftar miskonsepsi di bawah adalah draf tim dan wajib direview guru atau dosen pendidikan matematika sebelum uji coba.

| Kode | Nama | Contoh soal | Miskonsepsi yang dilacak (kode: contoh jawaban salah) |
| --- | --- | --- | --- |
| D1 | Bilangan Bulat | 3 − 8 = ? | D1.1: 3 − 8 = 5 (urutan dibalik). D1.2: −3 − 5 = −2. D1.3: (−4) × (−3) = −12. D1.4: 2 + 3 × 4 = 20 |
| D2 | Pecahan dan Desimal | 1/2 + 1/3 = ? | D2.1: 1/2 + 1/3 = 2/5. D2.2: 1/5 lebih besar dari 1/3. D2.3: 0,25 lebih besar dari 0,3. D2.4: perkalian selalu memperbesar (8 × 0,5 > 8) |
| D3 | Rasio, Proporsi, dan Persen | 2 : 3 = 6 : ? | D3.1: 2 : 3 = 6 : 7 (menambah, bukan mengalikan). D3.2: naik 10% dua kali dianggap naik 20%. D3.3: kenaikan dari 40 ke 50 dianggap 10% |
| D4 | Bentuk Aljabar | 3(x + 4) = ? | D4.1: 3x + 2 = 5x. D4.2: 3(x + 4) = 3x + 4. D4.3: jika x = 3, maka 2x² = 36. D4.4: −(x − 5) = −x − 5 |
| D5 | Persamaan Linear Satu Variabel | 2x + 6 = 10, x = ? | D5.1: x + 5 = 12 menjadi x = 12 + 5. D5.2: 2x + 6 = 10 menjadi x + 6 = 5. D5.3: 3x = 12 menjadi x = 12 − 3 |
| D6 | Fungsi Linear dan SPLDV | y = 2x + 1. Jika x = 3, y = ? | Belum didaftar. Pengecoh memakai galat hitung sampai daftar direview |
| Lanjut | Semua anak tangga sampai target dikuasai | Soal tantangan dari anak tangga target | Tidak ada; kelompok ini mendapat pengayaan |

Miskonsepsi anak tangga lain yang sudah dipakai di layar demo:

| Kode | Anak tangga | Soal demo | Jawaban salah dan penyebabnya |
| --- | --- | --- | --- |
| A2.1 | A2 Tambah dan kurang sampai 20 | 8 + 5 = ? (lisan) | 12: menghitung maju dengan ikut menghitung bilangan awal (8, 9, 10, 11, 12) |
| A2.2 | A2 Tambah dan kurang sampai 20 | 8 + 5 = ? (lisan) | 3: mengurangkan, bukan menjumlahkan |
| B4.1 | B4 Pecahan | Berapa bagian yang diwarnai? (3 dari 4) | 1/4: menyebut bagian yang tidak diwarnai |
| B4.2 | B4 Pecahan | Berapa bagian yang diwarnai? (3 dari 4) | 4/3: pembilang dan penyebut tertukar |
| B4.3 | B4 Pecahan | Berapa bagian yang diwarnai? (3 dari 4) | 3: hanya menghitung bagian yang diwarnai |

Soal demo SMA kelas 10, 3x − 7 = 11: kunci 6; pengecoh 4/3 dari D5.1, 15 dari D5.3, dan 18 sebagai galat hitung (lupa membagi).

**Aturan soal pilihan ganda:** setiap soal punya satu jawaban benar dan tiga pengecoh. Setiap pengecoh dihitung kode dari satu miskonsepsi. Kalau miskonsepsi yang cocok kurang dari tiga, sisanya diisi galat hitung biasa dan ditandai "galat hitung", bukan miskonsepsi. Pilihan "?" (belum tahu) selalu tersedia, supaya siswa tidak terdorong menebak.

### Memperkirakan penguasaan (Bayesian Knowledge Tracing)

Setiap siswa punya peluang menguasai tiap level, P(L), yang diperbarui setiap kali ia menjawab soal di level itu. Metodenya Bayesian Knowledge Tracing (Corbett dan Anderson, 1995), yang dipilih karena sederhana, cepat dihitung di HP, dan bisa dijelaskan ke guru.

Jika jawaban benar:

```latex
P(L \mid \text{benar}) = \frac{P(L)(1 - S)}{P(L)(1 - S) + (1 - P(L))\,G}
```

Jika jawaban salah:

```latex
P(L \mid \text{salah}) = \frac{P(L)\,S}{P(L)\,S + (1 - P(L))(1 - G)}
```

Setelah itu peluang belajar ditambahkan:

```latex
P(L)_{\text{baru}} = P(L \mid \text{jawaban}) + \big(1 - P(L \mid \text{jawaban})\big)\,T
```

| Parameter | Arti | Nilai awal |
| --- | --- | --- |
| P(L) awal | Peluang sudah menguasai sebelum ada data | 0,3 |
| T | Peluang menguasai setelah satu kesempatan belajar | 0,1 |
| G | Peluang menebak benar walau belum menguasai | 0,2 (empat pilihan, ditambah pilihan "?" yang mengurangi tebakan) |
| S | Peluang salah walau sudah menguasai | 0,1 |
| Ambang kuasai | P(L) minimal agar level dianggap dikuasai | 0,8 |

Jawaban "?" diperlakukan sebagai salah dengan G = 0 untuk observasi itu. Jawaban cek lisan memakai G = 0,05, karena siswa menjawab bebas sehingga hampir tidak bisa menebak. Nilainya sengaja tidak 0: dengan G = 0, satu jawaban benar membuat P(L) menjadi tepat 1 dan tidak bisa turun lagi walau jawaban berikutnya salah. Semua nilai di atas adalah titik awal; nilai final disetel dari data uji coba.

Soal dua tingkat di kartu keluar (jawaban lalu alasan) dihitung sebagai satu observasi: benar hanya kalau jawaban dan alasannya sama-sama benar. Untuk pasangan ini G = 0,1, karena menebak benar dua kali berturut-turut jauh lebih jarang, dan S = 0,2, karena siswa yang sudah menguasai punya dua kesempatan untuk keliru (1 − 0,9 × 0,9 ≈ 0,2). Contoh: dari P(L) = 0,3, satu pasangan benar menaikkan P(L) menjadi 0,7968 (belum dikuasai), dan pasangan benar kedua menjadi 0,9722. Satu pasangan salah menurunkan 0,3 menjadi 0,1783.

### Menentukan level siswa

1. **Level siswa** adalah anak tangga terendah yang P(L)-nya masih di bawah 0,8. P(L) 0,8 atau lebih berarti dikuasai. Kalau semua anak tangga sampai target kelas sudah di atas 0,8, siswa masuk "Lanjut".
2. **Cek Awal (sesi pertama, 10 soal):** satu soal untuk setiap anak tangga pada 10 anak tangga yang berakhir di target kelas (kelas 7: B4 sampai D5; kelas 10: D1 sampai E4). Kalau tangganya kurang dari 10, sisa soal diberikan ke anak tangga teratas.
   - Level awal = anak tangga terendah yang dijawab salah atau "?". Semua anak tangga di bawahnya, termasuk yang di bawah jangkauan cek, diberi P(L) = 0,85; anak tangga itu dan di atasnya diberi 0,3.
   - Siswa yang salah di anak tangga paling bawah ditandai "di bawah jangkauan" dan disarankan cek lisan (F16) untuk menemukan anak tangganya.
   - Aturan ini sengaja condong menempatkan terlalu rendah. Siswa yang ternyata sudah bisa naik lagi lewat kartu keluar dalam dua sesi.
3. **Cek Mingguan (5 soal):** jendela 5 anak tangga berurutan, dimulai dua anak tangga di bawah level terendah yang ditempati siswa di kelas itu (paling rendah A1). Contoh kelas 7B: level terendah D1, jadi jendelanya C3 sampai D3. Dua anak tangga terbawah menangkap siswa yang salah tempat; siswa di atas jendela mendapat bukti dari kartu keluar kelompoknya.
4. **Kartu Keluar** dua tingkat (3 baris): baris 1 soal di level kelompok, baris 2 alasan untuk jawaban baris 1, baris 3 soal konteks. Kelompok gabungan: baris 1 dan 2 di level terendahnya, baris 3 di level atasnya. Pasangan baris 1 dan 2 dihitung sebagai satu observasi (lihat BKT di atas), baris 3 sebagai observasi biasa.
5. Level yang ditampilkan baru berubah kalau hasil hitungnya berbeda dua sesi berturut-turut, supaya siswa tidak berpindah kelompok hanya karena satu kali menebak. Nilai baru yang ditampilkan adalah hasil hitung terakhir, walau dua hasil itu tidak sama (misalnya D2 lalu D3). Pengecualian: sesi pertama dan perubahan manual oleh guru.
6. **Cek lisan** (F16) memakai tangga yang sama. Titik mulai: dua anak tangga di bawah target untuk kelas 1 sampai 3, atau dua anak tangga di bawah level tercatat untuk siswa "di bawah jangkauan". Satu soal per anak tangga: benar berarti naik satu anak tangga; salah atau diam berarti berhenti, dan level siswa adalah anak tangga itu. Kalau soal pertama sudah salah, turun satu anak tangga sampai ada yang benar atau sampai A1; level siswa adalah anak tangga terendah yang dijawab salah. Titik mulai yang jatuh di bawah A1 (misalnya kelas 1 dengan target A2) dimulai dari A1.

### Membentuk kelompok

1. Hitung jumlah siswa di tiap level.
2. Mulai dengan satu kelompok per level yang berisi siswa.
3. Selama jumlah kelompok melebihi target (bawaan 3, bisa 2 sampai 4), gabungkan dua level bersebelahan yang jumlah siswanya paling sedikit.
4. Kelompok yang berisi kurang dari 3 siswa digabung ke tetangga yang lebih kecil.
5. Kelompok gabungan dari langkah 3 mendapat aktivitas untuk level terendahnya, ditambah soal perluasan untuk level di atasnya. Kelompok gabungan dari langkah 4 (kelompok kecil) mendapat aktivitas untuk level yang siswanya lebih banyak: siswa dari level yang lebih rendah ditandai "dampingi dulu" di HP guru dan Bisik menyiapkan kartu untuk level mereka, sedangkan siswa dari level yang lebih tinggi mendapat soal tantangan.
6. **Bentuk dan warna kelompok diacak setiap sesi,** supaya siswa tidak bisa menebak "Segitiga Biru pasti kelompok paling bawah".
7. Guru bisa memindahkan siswa antarkelompok. Perubahan ini dicatat, tapi tidak mengubah nilai P(L).

Penjelasan untuk guru (contoh, sama dengan layar HP Kelompok di kanvas): "Kelompok Segitiga Biru: 7 siswa di anak tangga D1. Miskonsepsi terbanyak D1.2 (−3 − 5 = −2), muncul pada 5 siswa."

## 6. Daftar fitur dan keterlacakan

Tiga belas fitur wajib (F1 sampai F8 dan F16 sampai F20) membentuk satu siklus utuh untuk semua jenjang dan harus jalan di demo. F17 sampai F20 adalah bagian pembelajaran interaktif: bagian yang membuat siswa menyentuh papan dan memahami, bukan hanya melihat. Kode masalah (M1 sampai M8) merujuk ke dokumen riset.

| Kode | Fitur | Prioritas | Masalah | Dasar riset atau pembanding | Aspek rubrik |
| --- | --- | --- | --- | --- | --- |
| F1 | Kelas dan Siswa | Wajib | M8 | Tidak ada; fitur dasar | Kualitas Kode, UI/UX |
| F2 | Kartu Nalar (cetak) | Wajib | M5, M1 | Plickers: menilai tanpa perangkat siswa, tapi hanya pilihan ganda tanpa pengelompokan | Inovasi, Keberlanjutan |
| F3 | Paket Sesi (agen penyiap) | Wajib | M7, M8 | EEF: AI memangkas waktu persiapan 31%; TaRL butuh materi per level | Inovasi, Dampak |
| F4 | Layar Kelas | Wajib | M5 | GEEAP: perangkat keras butuh perubahan pendukung | Relevansi, Keberlanjutan, UI/UX |
| F5 | Pindai Kartu | Wajib | M8 | TaRL: asesmen singkat sebagai langkah pertama | Kualitas Kode |
| F6 | Tangga dan Kelompok | Wajib | M2, M3 | TaRL (J-PAL, GEEAP); Mindspark | Inovasi dan Relevansi, Dampak |
| F7 | Bisik (asisten guru) | Wajib | M8 | Tutor CoPilot | Inovasi, Dampak |
| F8 | Kartu Keluar dua tingkat | Wajib | M2, M8 | TaRL: pantau kemajuan untuk memindahkan kelompok; tes dua tingkat (kerangka Treagust) untuk mengungkap miskonsepsi | Dampak |
| F16 | Cek Lisan (SD kelas 1 sampai 3 dan siswa di bawah jangkauan) | Wajib | M2, M8 | TaRL: asesmen lisan satu per satu yang sederhana | Inovasi dan Relevansi, Dampak |
| F17 | Mode Stasiun dan giliran adil | Wajib | M5, M8 | Rotasi stasiun untuk kelas dengan perangkat terbatas (Christensen Institute); TaRL: guru mendampingi per kelompok | Inovasi dan Relevansi, UI/UX |
| F18 | Alat Nalar (enam alat di MVP) | Wajib | M1, M5 | Manipulatif virtual: efek 0,35, naik bila dipakai rutin (Moyer-Packenham dan Westenskow, 2013) | Inovasi dan Relevansi, Dampak |
| F19 | Pembuka Bermakna dan Refleksi | Wajib | M1 | Pembelajaran Mendalam (Kemendikdasmen, 2025); PMRI; mencoba sebelum diajari (Sinha dan Kapur, 2021) | Inovasi dan Relevansi, Dampak |
| F20 | Tes Kemampuan Papan | Wajib | M5 | Spesifikasi resmi papan belum ditemukan; aplikasi menyesuaikan diri dengan papan yang ada | Keberlanjutan, Kualitas Kode |
| F9 | Kemajuan Kelas | Sebaiknya | M1, M2 | TaRL | Dampak |
| F10 | Ringkasan untuk Wakasek | Sebaiknya | M4, M8 | Agenda Rapor Pendidikan 2025 | Relevansi (manajemen pendidikan) |
| F11 | Mode Tanpa Layar | Sebaiknya | M5 | Satu papan per sekolah belum tentu ada di tiap kelas | Keberlanjutan |
| F12 | Panduan Guru di aplikasi | Sebaiknya | M8 | Rapor Pendidikan: pendampingan berkelanjutan, bukan pelatihan sekali | Keberlanjutan |
| F13 | Jejak dan Audit | Sebaiknya | Kepercayaan guru | Tidak ada | Kualitas Kode |
| F14 | Mode Satu Perangkat | Nanti | Koneksi kelas tidak dijamin | Tidak ada | Keberlanjutan |
| F15 | Pindai banyak kartu dalam satu foto | Nanti | M7 | Tidak ada | UI/UX |

Tidak dikerjakan di MVP: chatbot untuk siswa, pembacaan tulisan tangan, peringkat siswa, integrasi e-Rapor, mapel selain matematika.

## 7. Spesifikasi fitur

Setiap fitur wajib punya user story, cara kerja, dan kriteria penerimaan yang bisa dicentang. Angka bertanda "target" harus diukur; tidak boleh ditulis sebagai hasil sebelum diukur.

### F1 Kelas dan Siswa (wajib)

*Sebagai guru, saya membuat kelas dalam satu menit supaya bisa langsung memulai sesi.*

- Guru masuk dengan email (tautan masuk sekali pakai).
- Buat kelas: nama rombel (misalnya 7B) dan jumlah siswa 1 sampai 40. Sistem membuat nomor absen 1 sampai N, masing-masing dengan ID acak.
- Nama panggilan siswa bersifat opsional, hanya disimpan di perangkat guru, dan bisa diekspor atau diimpor sebagai CSV untuk pindah perangkat.

* [ ] Kelas baru siap dipakai dalam maksimal 3 langkah
* [ ] Server tidak pernah menerima nama siswa (dicek uji otomatis pada semua payload)
* [ ] Impor CSV nama berjalan tanpa internet

### F2 Kartu Nalar (wajib)

*Sebagai guru, saya mencetak satu lembar induk yang bisa difotokopi untuk semua kelas.*

- Empat kartu per lembar A4 (tiap kartu kira-kira A6), aman difotokopi hitam putih.
- Isi kartu: penanda hitam di empat sudut, QR berisi jenis kartu dan versi tata letak (tanpa data pribadi), gelembung nomor absen (puluhan 0 sampai 4 dan satuan 0 sampai 9, cukup untuk 40 siswa) dengan kotak tulis di sampingnya, baris jawaban dengan gelembung A, B, C, D, dan ?, serta garis nama yang tidak dibaca mesin.
- Tiga varian: Cek Awal (10 baris), Cek Mingguan (5 baris), dan Kartu Keluar (3 baris: soal, alasan, soal konteks). Cek Awal dicetak A5, dua per lembar A4, karena 10 baris tidak muat di A6.
- Petunjuk tercetak: "Hitamkan penuh satu gelembung. Belum tahu? Pilih ?", beserta contoh isian yang terbaca dan yang tidak. Kartu dipakai mulai kelas 4

* [ ] PDF A4 bisa diunduh dari aplikasi
* [ ] Kartu dari fotokopi generasi kedua tetap terbaca pada uji
* [ ] QR tidak memuat data pribadi

### F3 Paket Sesi (wajib)

*Sebagai guru, sehari sebelum kelas saya menekan satu tombol dan semua materi sesi siap.*

1. Agen membaca distribusi level dan miskonsepsi dominan kelas dari dua sesi terakhir (tanpa nama).
2. Agen menentukan jendela cek kelas itu (bagian 5), lalu memilih templat: soal cek level, masalah pembuka beserta pertanyaan lanjutannya, dan set aktivitas untuk setiap anak tangga yang mungkin muncul hari itu (dari dua anak tangga di bawah level terendah yang ditempati sampai satu anak tangga di atas level tertinggi, sehingga siswa yang turun karena cek level tetap punya aktivitas). Tiap set berisi 3 tugas Stasiun Papan (2 di SD) untuk Alat Nalar anak tangga itu (masing-masing dengan 3 petunjuk bertingkat), lembar tugas mandiri (3 tugas wajib dan 1 tugas boleh; bergambar untuk kelas 1 sampai 3), 1 contoh terbimbing untuk Stasiun Guru, dan kartu keluar dua tingkat (soal, 4 pilihan alasan, soal konteks). Kelompok baru diketahui di kelas, jadi setelah pindai HP memilih set yang cocok dengan anak tangga aktivitas tiap kelompok. Untuk kelas 1 sampai 3, Paket Sesi juga membuat lembar aktivitas umum bergambar untuk dikerjakan siswa selama cek lisan penuh.
3. Kode mengisi angka templat secara acak dalam batas yang ditentukan, lalu menghitung kunci dan pengecoh dari aturan miskonsepsi. Empat pilihan alasan di baris 2 kartu keluar diambil dari kartu alasan per anak tangga yang ditulis tim: satu alasan benar dan tiga alasan salah. Tiap alasan salah terikat ke satu kode miskonsepsi, atau ditandai galat kalau miskonsepsi yang cocok kurang dari tiga; dua alasan tidak boleh berkode sama. Soal kartu keluar memakai angka yang berbeda dari soal yang dikerjakan di stasiun hari itu.
4. Konteks dasar tiap anak tangga diambil dari tab Katalog Materi Bermakna. LLM menyesuaikannya dengan daerah dan menulis konteks cerita lokal untuk paling banyak sepertiga soal (misalnya harga di pasar atau jarak antarkota). Kode memeriksa bahwa semua angka di cerita sama dengan angka templat dan tidak ada angka baru.
5. Soal yang gagal diperiksa dibuang dan diganti versi tanpa cerita.
6. Paket disimpan di HP dan Layar Kelas untuk dipakai tanpa internet. Guru bisa melihat pratinjau dan mengganti soal.

- [ ] Paket siap dalam 30 detik saat online (target)
- [ ] Tanpa internet, paket tetap bisa dibuat dari templat saja
- [ ] Uji otomatis atas 500 soal: 0 kunci salah, 0 pengecoh yang sama dengan kunci, 0 pengecoh kembar, setiap alasan salah punya kode miskonsepsi atau tanda galat tanpa kode ganda, dan 0 soal kartu keluar yang sama dengan soal stasiun
- [ ] Input ke LLM tidak memuat nama siswa
- [ ] Guru bisa mengganti satu soal dengan satu ketukan

### F4 Layar Kelas (wajib)

*Sebagai guru, saya membuka Layar Kelas di papan interaktif dan mengendalikannya dari HP.*

- Browser di papan membuka halaman Layar Kelas dan menampilkan kode pasangan 6 digit. Guru memasukkan kode itu di HP untuk menyambungkan.
- Sepuluh mode tampilan: Pembuka (masalah nyata dan penanda tebakan), Soal (satu soal per layar dengan timer), Lanjutan (pertanyaan lanjutan pembuka selama guru memindai), Kelompok (bentuk, warna, nomor absen, dan stasiun pertama), Stasiun (Alat Nalar untuk kelompok di papan dan Papan Tugas Mandiri), Berdua (papan dibagi dua untuk dua Pilot), Panel Terbagi (2 sampai 4 panel, untuk varian singkat), Sorot (satu kelompok layar penuh), Kartu Keluar dua tingkat (satu baris per layar untuk tiap kelompok), dan Refleksi (kalimat rumpang dan zona tulis). Tes Kemampuan Papan tampil saat papan pertama kali dipakai (F20).
- Tombol Lanjut dan Kembali yang besar juga ada di layar sentuh, jadi sesi tetap jalan tanpa HP.
- Teks soal minimal 56 px pada layar 1920 x 1080, angka memakai Atkinson Hyperlegible, dan tanda minus memakai karakter − (U+2212), bukan tanda hubung. Untuk SD, setiap soal disertai gambar atau model (batang pecahan, garis bilangan, benda). Tugas mandiri dibagikan sebagai lembar cetak, satu lembar untuk dua siswa; Papan Tugas Mandiri di papan hanya ringkasannya, dengan teks minimal 40 px.

* [ ] HP dan layar tersambung dalam 5 detik saat online (target)
* [ ] Perintah dari HP sampai di layar dalam 1 detik (target)
* [ ] Layar tidak pernah menampilkan nama siswa atau angka level (dicek uji otomatis)
* [ ] Seluruh sesi bisa dijalankan hanya dengan sentuhan di layar
* [ ] Teks terbaca dari bangku paling belakang (uji di ruang kelas)

### F5 Pindai Kartu (wajib)

*Sebagai guru, saya memotret 32 kartu dalam sekitar 2 menit dan langsung tahu hasilnya.*

- Kamera HP terbuka dengan bingkai panduan. Foto diambil otomatis saat empat penanda sudut terdeteksi dan gambar tidak buram.
- Semua pembacaan terjadi di HP, bukan di server: koreksi perspektif dari penanda sudut, baca QR, lalu baca nomor absen dan jawaban dari tingkat kehitaman gelembung.
- Satu gelembung terisi berarti jawaban. Lebih dari satu gelembung di satu baris ditandai "ganda" untuk dicek guru. Gelembung yang terlalu samar untuk diputuskan ditandai "perlu dicek" dengan cara yang sama. Tidak ada yang terisi dianggap "?".
- Setelah terbaca: HP bergetar, bunyi singkat, dan tulisan besar "Absen 07 terbaca".
- Nomor absen yang tidak ada di kelas atau sudah dipindai memunculkan pilihan untuk guru.

* [ ] Akurasi per jawaban diukur pada 30 kartu uji di 3 kondisi cahaya (target 99%)
* [ ] Maksimal 3 detik per kartu termasuk umpan balik (target)
* [ ] Berjalan dengan mode pesawat aktif
* [ ] Kartu yang dipindai dua kali tidak menggandakan data
* [ ] Guru bisa mengoreksi hasil satu kartu secara manual

### F6 Tangga dan Kelompok (wajib)

*Sebagai guru, begitu kartu terakhir dipindai, saya melihat kelompok yang sudah terbentuk beserta alasannya.*

Logika lengkapnya ada di bagian 5.

- [ ] Kelompok tampil maksimal 5 detik setelah kartu terakhir dipindai (target)
- [ ] Fungsi BKT dan pengelompokan punya unit test dengan contoh hitungan manual
- [ ] Input yang sama selalu menghasilkan kelompok yang sama; hanya bentuk dan warna yang diacak dengan seed per sesi
- [ ] Setiap siswa punya penjelasan "kenapa di level ini" berupa jawabannya per soal
- [ ] Pemindahan siswa oleh guru tercatat

### F7 Bisik (wajib, versi ringan)

*Sebagai guru, saat duduk di satu kelompok, saya membuka kartu Bisik kelompok itu dan mendapat saran yang bisa langsung saya pakai.*

- Isi kartu Bisik per kelompok: miskonsepsi dominan, 3 pertanyaan pemantik (bukan jawaban), 1 cara menjelaskan dengan benda atau gambar, dan 1 soal cek cepat.
- Sumbernya adalah kartu strategi per miskonsepsi yang ditulis dan direview tim, bukan dikarang LLM. LLM hanya menyesuaikan kata-kata dengan soal yang sedang dikerjakan kelompok.
- Mode tanya bebas: guru mengetik situasi, misalnya "siswa bingung kenapa −3 − 5 = −8", dan Bisik menjawab maksimal 80 kata.
- Tanpa internet, kartu strategi statis tetap tampil.

* [ ] Tersedia satu kartu strategi untuk tiap miskonsepsi di bagian 5 (18 untuk Fase D dan 5 untuk anak tangga demo SD)
* [ ] Kartu Bisik per kelompok langsung tampil karena dibuat saat Paket Sesi disiapkan
* [ ] Tanya bebas menjawab dalam 5 detik saat online (target)
* [ ] Setiap saran menyebut kode miskonsepsi sumbernya
* [ ] Guru bisa menandai saran "berguna" atau "tidak berguna"

### F8 Kartu Keluar dua tingkat (wajib)

- Tiga baris per kelompok, tampil di panel masing-masing, satu baris per layar supaya teks tetap besar. Baris 1: soal di level kelompok. Baris 2: "Kenapa?" dengan empat pilihan alasan, satu benar dan tiga yang mewakili miskonsepsi atau galat. Baris 3: soal konteks, yaitu konsep yang sama di situasi nyata. Kelompok gabungan mendapat baris 1 dan 2 di level terendahnya dan baris 3 di level atasnya. Di kelas 1 sampai 3, kartu keluar diganti cek lisan singkat di Stasiun Guru: satu soal lalu "kenapa?", dan guru memilih di HP alasan yang paling dekat dengan jawaban siswa.
- Guru memindai kartu keluar kapan saja setelah kelas lewat F5.

* [ ] Sistem tahu soal mana yang dijawab tiap siswa berdasarkan kelompoknya di sesi itu
* [ ] Hasilnya memperbarui level untuk sesi berikutnya
* [ ] Jawaban benar dengan alasan salah dicatat sebagai belum paham (observasi salah), dan kode miskonsepsinya diambil dari alasan yang dipilih
* [ ] Pasangan baris 1 dan 2 memakai G = 0,1 dan S = 0,2, dengan unit test dari contoh hitungan di bagian 5
* [ ] Layar Kemajuan menampilkan persentase "benar dan paham" per anak tangga; angka ini tidak pernah tampil di papan

### F16 Cek Lisan (wajib)

Sebagai guru kelas 1 sampai 3, saya mengecek level siswa satu per satu dengan menanyakan soal, tanpa siswa perlu membaca atau mengisi kartu.

- Guru memilih kelas dan nomor absen. Aplikasi menampilkan tangga kecil dengan posisi siswa, soal, kalimat yang dibacakan, dan kuncinya.
- Guru menekan Benar, Salah, atau Diam atau belum tahu. Kalau salah, guru boleh memilih jawaban siswa dari pilihan yang dihitung dari miskonsepsi (untuk 8 + 5: 12 dari A2.1, 3 dari A2.2, dan 14 sebagai galat hitung) atau "Lainnya".
- Aplikasi menentukan soal berikutnya dengan aturan cek lisan di bagian 5, lalu pindah ke nomor absen berikutnya. Siswa yang tidak hadir bisa dilewati dan dicek belakangan.
- Dipakai juga untuk siswa kelas 4 ke atas yang ditandai "di bawah jangkauan".

* [ ] Satu siswa selesai dalam sekitar 1 menit (target, diukur)
* [ ] Soal lisan dibuat dari templat yang sama dengan soal kartu, ditambah kalimat baca
* [ ] Hasil memperbarui P(L) dengan G = 0,05
* [ ] Berjalan dengan mode pesawat aktif
* [ ] Nama siswa hanya tampil di HP guru, dan hanya bila guru mengisinya

### F17 Mode Stasiun dan giliran adil (wajib)

Sebagai guru, saya menjalankan tiga stasiun bergiliran, sehingga setiap kelompok sekali menyentuh papan, sekali saya dampingi, dan sekali bekerja mandiri, tanpa menyusun jadwal sendiri.

- Setelah kelompok terbentuk, kode menyusun urutan putaran. Kelompok diurutkan dari anak tangga terendah (i = 0). Dengan 3 kelompok, stasiun kelompok i di putaran r adalah S\[(r − i) mod 3\], dengan S = Guru, Papan, Mandiri. Hasilnya, kelompok terendah bertemu guru lebih dulu dan kelompok tertinggi mulai di papan.
- Dengan 4 kelompok, S = Guru, Papan, Mandiri, Mandiri dan rotasi berisi 4 putaran; dua kelompok berbagi Stasiun Mandiri. Lama putaran = (waktu rotasi − 4 menit jeda) dibagi 4, dibulatkan ke bawah; contoh SMP: (48 − 4) / 4 = 11 menit. Dengan 2 kelompok, kelompok terendah mendapat Guru, Papan, Mandiri dan kelompok tertinggi Papan, Mandiri, Guru.
- Layar Kelas di Mode Stasiun: dua pertiga kiri untuk Alat Nalar kelompok yang sedang di papan, sepertiga kanan untuk Papan Tugas Mandiri (ringkasan; tugas lengkap ada di lembar cetak), dan pita atas untuk tujuan hari ini serta timer "Pindah dalam".
- Di HP guru: tambah 3 menit, akhiri putaran, tahan satu kelompok, buka petunjuk berikutnya, dan "Tunjukkan jawaban" yang meminta konfirmasi. Kartu Bisik untuk kelompok yang sedang di Stasiun Guru terbuka otomatis.
- Pilot dan Navigator dipilih kode dari anggota kelompok yang hadir dengan jumlah giliran paling sedikit sepanjang semester; seri diacak. Peran bergeser tiap tugas. Pilot di Pembuka Bermakna dipilih dari seluruh kelas dengan aturan yang sama. Guru bisa menandai siswa "Navigator dulu". Tiap tugas memakai 2 Pilot bila papan lolos tes dua sentuhan, 1 Pilot bila tidak. Di depan papan paling banyak 4 siswa berdiri (Pilot dan 1 sampai 2 Navigator); anggota lain duduk di bangku terdepan dan menulis tebakan. Kelompok di atas 8 siswa dibagi menjadi dua tim yang bergantian maju tiap tugas.
- Jumlah giliran disimpan per ID acak siswa. Papan hanya menampilkan nomor absen.

* [ ] Unit test urutan putaran untuk 2, 3, dan 4 kelompok: setiap kelompok mendapat Stasiun Guru dan Stasiun Papan tepat sekali, dan Stasiun Guru serta Stasiun Papan tidak pernah diisi dua kelompok di putaran yang sama
* [ ] Contoh 7B menghasilkan urutan yang sama dengan tab Desain Pembelajaran Interaktif (Segitiga Biru: Guru, Papan, Mandiri)
* [ ] Simulasi giliran (500 kelas, 32 siswa, 5% absen per sesi, 2 Pilot per tugas, 3 tugas per putaran): semua siswa pernah menjadi Pilot dalam 3 sesi di minimal 95% kelas
* [ ] Perubahan waktu dari HP sampai di timer papan dalam 1 detik (target)
* [ ] Kartu Bisik kelompok di Stasiun Guru terbuka tanpa ketukan tambahan

### F18 Alat Nalar (wajib)

Sebagai siswa, saya membagi, menggeser, dan menimbang benda matematika di papan, sehingga saya melihat sendiri kenapa sebuah aturan benar.

- Enam alat di MVP: Garis Bilangan Lompat (C2, C4, D1), Batang Pecahan (A4, B4, C3, D2), Tabel Rasio (C4, D3), Ubin Aljabar (D4), Timbangan Persamaan (D5), dan Grafik Geser (D6, E2 sampai E4). Urutan bangun: empat alat untuk demo 7B lebih dulu, lalu Timbangan Persamaan dan Grafik Geser untuk SMA 10. Empat alat lain dari tab Desain Pembelajaran Interaktif dibuat setelah MVP.
- Setiap alat punya keadaan (state) murni, aksi yang bisa dibatalkan, dan fungsi cek(model, soal) yang memeriksa model yang disusun siswa, bukan hanya jawaban akhir. Bagian model yang belum cocok dengan soal ditandai garis putus-putus.
- Hanya tiga gerakan: ketuk, seret, dan tahan sebentar (sekitar setengah detik). Satu jari memegang satu objek sampai jari diangkat. Sentuhan dengan bidang kontak besar, seperti telapak tangan, diabaikan.
- Di layar 1920 x 1080, objek yang diseret minimal 88 px dan tombol minimal 96 px. Di SD semua yang disentuh ada di dua pertiga bawah layar.
- Angka menyusul model: angka atau simbol baru muncul setelah siswa memanipulasi model. Setiap aksi menghasilkan perubahan yang terlihat dalam kurang dari 0,5 detik.
- Tujuh pola interaksi (Tebak Dulu, Lihat Dulu, Jelajah, Bangun Model, Cari Kesalahan, Berdua, Tantangan Terbuka) berjalan di atas alat yang sama, jadi siswa cukup belajar cara menyentuhnya sekali.
- Umpan balik tanpa kata "salah", bunyi salah, atau tanda silang. Petunjuk bertingkat tiga: pertanyaan, sorotan, lalu contoh kembar. Jawaban hanya dibuka guru dari HP.
- Kalau papan tidak mendukung sentuhan, alat dijalankan dari HP guru seperti trackpad.

* [ ] Jeda dari sentuhan sampai model berubah di bawah 0,5 detik di papan uji (target, diukur)
* [ ] Dua siswa menyeret dua objek bersamaan tanpa saling merebut, di papan yang lolos tes dua sentuhan
* [ ] Setiap alat punya unit test cek() dengan model yang benar dan satu model untuk tiap miskonsepsi anak tangganya
* [ ] Tidak ada teks "salah", bunyi salah, atau tanda silang di Layar Kelas (uji otomatis atas teks antarmuka dan aset)
* [ ] Setiap aksi bisa dibatalkan dengan tombol "Ulang langkah"

### F19 Pembuka Bermakna dan Refleksi (wajib)

Sebagai siswa, saya tahu untuk apa materi hari ini sebelum mulai berhitung, dan di akhir pelajaran saya menuliskan gunanya dengan kata-kata sendiri.

- Paket Sesi memilih satu masalah pembuka dari tab Katalog Materi Bermakna yang bisa dimasuki semua anak tangga di jendela kelas: mudah dimulai, bisa diperluas. Paket juga menyiapkan satu pertanyaan lanjutan untuk dikerjakan selama guru memindai. Di SD, pembuka hanya meminta tebakan yang bisa dijawab dengan intuisi (lebih besar atau lebih kecil, kira-kira berapa); cara menghitungnya diperlihatkan dulu lewat Lihat Dulu di stasiun, sesuai temuan Sinha dan Kapur untuk siswa kelas 2 sampai 5.
- Pembuka: masalah nyata dan pertanyaan "Tebak dulu" tampil. Semua siswa menulis tebakan di buku, dua Pilot menaruh penanda tebakan, dan setelah "Jalankan" hasilnya tampil di samping tebakan. Tujuan belajar hari itu tampil di pita atas sepanjang sesi.
- Refleksi: tiga kalimat rumpang ("Hari ini aku belajar", "Ini berguna untuk", "Yang masih membingungkan") ditulis di buku. Tiga siswa menulis di zona tulis papan, lalu guru menutup dengan mengaitkan kegunaan yang ditemukan tiap kelompok. Kelas 1 sampai 3 memakai refleksi lisan.
- Zona tulis tidak disimpan, tidak dikirim ke server, dan dibersihkan saat sesi ditutup, karena siswa mungkin menulis nama.
- Boleh: guru mencatat satu hal yang paling membingungkan kelas di HP, dan Paket Sesi minggu berikutnya memakainya untuk memilih tugas Cari Kesalahan.

* [ ] Setiap anak tangga yang dipakai demo 7B, SD 5, dan SMA 10 punya minimal satu pembuka, satu kegunaan, dan satu pertanyaan kenapa di Katalog, sudah direview tim
* [ ] Angka di masalah pembuka dan jawabannya dihitung ulang kode (contoh: lift dari B2 ke lantai 5 naik 7 lantai)
* [ ] Uji lalu lintas jaringan: tidak ada gambar atau goresan zona tulis yang keluar dari Layar Kelas

### F20 Tes Kemampuan Papan (wajib)

Sebagai guru, saat pertama kali membuka PapanNalar di sebuah papan, saya menjalankan tes sekitar 1 menit supaya aplikasi menyesuaikan diri dengan papan itu.

- Enam pemeriksaan: layar sentuh, dua sentuhan bersamaan, empat sentuhan bersamaan, browser dan layar (Pointer Events, IndexedDB, service worker, resolusi; dibaca otomatis), kelancaran sentuhan, dan tinggi papan (dijawab guru).
- Setiap hasil punya cadangan. Tanpa sentuhan, Alat Nalar dijalankan dari HP guru. Tanpa dua sentuhan, Mode Berdua dimatikan. Browser kurang lengkap, muncul pesan untuk membuka Layar Kelas di laptop yang disambung ke papan. Papan terlalu tinggi, zona sentuh turun ke setengah bawah layar.
- Profil papan disimpan di browser papan itu dan dikirim ke server tanpa data siswa, supaya tim tahu variasi papan di lapangan.

* [ ] Tes selesai dalam sekitar 1 menit (target, diukur)
* [ ] Semua pola interaksi tetap bisa dijalankan di papan tanpa sentuhan, lewat HP guru
* [ ] Profil papan yang dikirim tidak memuat data siswa (uji otomatis pada payload)
* [ ] Tes bisa diulang dari menu Layar Kelas

### Fitur "sebaiknya" (ringkas)

| Fitur | Isi | Kriteria utama |
| --- | --- | --- |
| F9 Kemajuan Kelas | Jumlah siswa per level per minggu, riwayat level per siswa, daftar siswa yang tidak naik 3 sesi berturut-turut, dan persentase "benar dan paham" per anak tangga | Data sesuai log sesi |
| F10 Ringkasan untuk Wakasek | Halaman web per kelas: distribusi level terkini dan perubahan 4 minggu; ringkasan teks dari LLM; ekspor CSV | Setiap angka di teks ringkasan dicek sama dengan data; tanpa nama siswa |
| F11 Mode Tanpa Layar | PDF lembar aktivitas per kelompok beserta kunci untuk guru | Terbaca saat dicetak hitam putih |
| F12 Panduan Guru | Pengenalan 5 langkah, video 3 menit, daftar periksa sesi pertama | Guru baru bisa memulai sesi tanpa bantuan tim |
| F13 Jejak dan Audit | Log pemindahan siswa, soal yang diganti, dan saran Bisik yang dipakai | Setiap perubahan punya waktu dan pelaku |

## 8. Kebutuhan non-fungsional

Semua angka di tabel ini adalah target yang harus diukur. Detail teknis cara memenuhinya ada di tab Spesifikasi Teknis (tahap 2).

| Kategori | Kebutuhan | Target | Cara uji |
| --- | --- | --- | --- |
| Kinerja | Pindai per kartu; kelompok tampil; Paket Sesi siap | Maks. 3 detik; maks. 5 detik; maks. 30 detik saat online | Log waktu di aplikasi |
| Kinerja | Respons Alat Nalar terhadap sentuhan di papan | Perubahan tampil kurang dari 0,5 detik | Log waktu di papan uji |
| Tanpa internet | Kartu Nalar, Pindai Kartu, Tangga dan Kelompok, dan Kartu Keluar tetap berjalan; data antre lalu sinkron | Tidak ada data hilang walau aplikasi ditutup | Uji mode pesawat, lalu tutup dan buka ulang aplikasi |
| Privasi | Nama siswa hanya di perangkat guru; server menyimpan ID acak, nomor absen, dan jawaban | 0 nama di server dan di prompt LLM | Uji otomatis pada payload dan log prompt |
| Privasi | Tulisan tangan di zona tulis papan tidak disimpan dan tidak dikirim | 0 gambar atau goresan tulisan di server | Uji otomatis pada lalu lintas jaringan Layar Kelas |
| Privasi (UU PDP Pasal 25) | Uji coba dengan siswa butuh izin sekolah dan persetujuan orang tua atau wali; sekolah bisa meminta data dihapus | Formulir persetujuan tersedia sebelum uji coba | Periksa berkas sebelum uji coba |
| Keamanan | Guru hanya melihat kelasnya; kunci API hanya di server; batas jumlah permintaan Bisik | Uji akses silang dengan 2 akun gagal | Uji otomatis |
| Aksesibilitas | Kontras teks memenuhi WCAG 2.1 AA; target sentuh minimal 48 px di HP, serta 88 px untuk objek seret dan 96 px untuk tombol di papan; informasi tidak hanya lewat warna (kelompok punya bentuk dan nama) | Semua token warna lolos (tab Brand) | Pemeriksa kontras dan uji manual |
| Kompatibilitas | Aplikasi Guru di Chrome Android; Layar Kelas di Chrome atau Edge desktop dan browser papan interaktif; kemampuan tiap papan dicek dengan Tes Kemampuan Papan | Diuji di minimal 1 HP kelas menengah bawah dan 1 layar besar | Uji perangkat nyata |
| Keandalan | Pindai dua kali tidak menggandakan data; simpan otomatis; coba ulang saat sinkron gagal | 0 data ganda pada uji | Uji otomatis |
| Biaya | Token LLM dicatat per sesi | Biaya per kelas per minggu dihitung di tab Rencana Bisnis | Log token |
| Kualitas kode | TypeScript mode strict, linter, format otomatis, unit test untuk modul inti (pembaca kartu, BKT, pengelompokan, generator soal), uji ujung ke ujung untuk alur utama, CI | Cakupan tes modul inti minimal 80% (target); CI hijau di commit terakhir | GitHub Actions |
| Bahasa | Seluruh antarmuka berbahasa Indonesia sesuai panduan gaya bahasa | Tidak ada istilah terlarang (tab Brand) | Review teks |

## 9. Di luar cakupan MVP dan roadmap

MVP hanya perlu membuktikan satu siklus utuh berjalan. Uji coba dengan siswa sungguhan dilakukan di jendela finalis, setelah izin sekolah dan persetujuan orang tua didapat.

&#91;embedded content: roadmap PapanNalar · 3 fase, 2 gerbang\]

**Sengaja tidak dikerjakan sampai ada bukti kebutuhannya:** chatbot untuk siswa (riset Bastani dkk. menunjukkan AI tanpa pengaman bisa menurunkan hasil ujian), pembacaan tulisan tangan (risiko over-correction), peringkat siswa (bertentangan dengan tujuan TaRL), dan integrasi e-Rapor (hasil PapanNalar bukan nilai rapor).

Jadwal final mengikuti guidebook: pengumpulan karya finalis 12 sampai 25 Oktober dan final 31 Oktober 2026. Tanggal ini perlu dikonfirmasi ke panitia karena juknis Hackathon dan jadwal umum sedikit berbeda.
