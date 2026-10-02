# Build, QA, dan Pitch

## Ringkasan

Ada tiga gerbang: berkas penyisihan 1 Oktober, berkas finalis 12 sampai 25 Oktober, dan final 31 Oktober 2026 (tanggal dari guidebook, dikonfirmasi ulang ke panitia). Di penyisihan, targetnya prototipe inti yang jalan: kartu, pindai, kelompok, dan Garis Bilangan untuk kelas 7B; yang belum sempat jalan ditampilkan sebagai desain berlabel. Semua 13 fitur wajib harus jalan di final.

| Peran | Pegangan utama | Mengerjakan |
| --- | --- | --- |
| Developer (rekan tim) | Tab Spesifikasi Teknis, urutan pengerjaan 17 langkah | Kode, tes otomatis, deploy |
| Azka | Tab PRD, Desain Pembelajaran Interaktif, Katalog Materi Bermakna | Keputusan produk, konten soal dan miskonsepsi, uji coba di kelas, concept paper, video, pitch |
| Anggota tim lain, bila ada | Tab Brand dan Desain, UX dan Layar, kanvas desain | Aset visual, rekaman video, gladi |

Aturan pemotongan bila waktu tidak cukup: yang ditunda adalah fitur Sebaiknya (F9 sampai F13) dan langkah 17. Fitur wajib tidak dipotong: bila langkah 15 (Timbangan Persamaan, Grafik Geser, Panel Terbagi, dan Sorot) terlambat, langkah itu pindah ke 26 sampai 28 Oktober menggantikan langkah 17. Siklus 7B selalu didahulukan karena itulah bukti utama di depan juri.

## Rencana build

Rencana ini mengandaikan satu developer bekerja penuh pada kode, sementara Azka memegang konten, izin uji, uji kelas, dan berkas. Setelah 1 Oktober pengerjaan jalan terus tanpa menunggu pengumuman finalis, karena jendela berkas finalis hanya dua minggu dan tanggal pengumumannya belum ada di dokumen ini.

&#91;embedded content: rencana build · 29 Sep sampai 31 Okt 2026, per minggu · tanggal panitia dari guidebook, perlu dikonfirmasi\]

Jalur kritisnya ada di langkah 1 sampai 11. Uji kelas memakai build tanggal 16 Oktober dan hasilnya harus masuk berkas finalis, jadi setiap hari terlambat di sini langsung memotong waktu uji. Rencana ini padat: kalau developer tidak bisa penuh waktu, titik cek 10 Oktober yang pertama memberi tanda, dan penundaan diputuskan saat itu juga. Kode dibekukan 29 Oktober supaya dua hari terakhir hanya dipakai untuk gladi.

| Gerbang | Tanggal | Harus sudah ada | Bila belum siap |
| --- | --- | --- | --- |
| 1. Berkas penyisihan | 1 Okt | Concept paper maksimal 8 halaman dan video. Target: prototipe kartu, pindai, kelompok, dan Garis Bilangan 7B jalan | Layar yang belum jalan diambil dari kanvas dan diberi label "desain". Tidak ada klaim bahwa fitur itu sudah jalan |
| Titik cek build | 10 Okt | Langkah 1 sampai 8 selesai, CI hijau, akurasi pembaca kartu sudah diukur | Langkah 17 dicoret. Bila terlambat lebih dari 3 hari, F9 sampai F13 ditunda dan langkah 15 pindah ke 26 sampai 28 Okt |
| Titik cek uji | 16 Okt | Sesi pertama kelas baru jalan penuh tanpa data seed (Cek Awal A5, kelompok, tiga putaran stasiun, kartu keluar), kartu Bisik statis tampil, tes papan lulus, izin kepala sekolah dan persetujuan orang tua sudah di tangan | Uji kelas mundur ke 21 sampai 23 Okt dengan 1 sesi. Bila tetap tidak bisa, berkas finalis menulis terang bahwa uji kelas belum dilakukan |
| 2. Berkas finalis | Target 24 Okt, batas panitia 25 Okt | 13 fitur wajib jalan, Playwright hijau di staging, hasil uji ditulis apa adanya, isi berkas mengikuti juknis finalis | Tunda fitur Sebaiknya sesuai aturan di atas. Fitur wajib yang belum jalan disebut terang, tidak ditutupi mockup |
| 3. Final | 31 Okt | Kode beku sejak 29 Okt, demo 6 menit lancar 3 kali berturut-turut, semua cadangan panggung siap, 14 pertanyaan juri sudah dilatih | Bagian demo yang gagal diganti rekaman cadangan |

Menit 5:15 di skenario demo memakai layar Kemajuan dari langkah 17. Bila langkah 17 dicoret, menit itu hanya memakai layar Refleksi, dan kalimat yang diucapkan tetap sama. Uji kelas memakai build 16 Oktober, jadi Bisik tanya bebas dan sinkron tanpa internet belum ikut diuji dengan siswa; laporan uji menyebut batas ini.

## Rencana uji

Tabel ini memuat uji utama; kriteria penerimaan PRD yang lain masuk baris terakhir sebagai daftar periksa. Uji otomatis jalan di CI setiap pull request; uji perangkat dan uji kelas dijadwalkan.

| Jenis | Yang dites | Alat | Lulus bila | Kapan |
| --- | --- | --- | --- | --- |
| Unit | BKT (termasuk pasangan dua tingkat), level, kelompok, rotasi stasiun, giliran Pilot, cek lisan | Vitest | Semua kasus uji di Spesifikasi Teknis lulus; cakupan core/ minimal 80% | Setiap pull request |
| Generator soal | 500 soal per templat, kartu alasan | Vitest dengan seed tetap | 0 kunci salah, 0 pengecoh kembar, setiap alasan salah berkode atau bertanda galat, 0 soal kartu keluar sama dengan soal stasiun | Setiap pull request |
| Pembaca kartu | 1.000 kartu sintetis dan 30 foto kartu asli di 3 kondisi cahaya, termasuk fotokopi generasi kedua | Vitest dan set foto uji | Target 99% per jawaban; angka final ditulis dari hasil ukur | Sebelum berkas finalis |
| Privasi | Semua permintaan jaringan dan prompt LLM | Playwright mencegat jaringan | 0 nama siswa; 0 gambar zona tulis keluar dari Layar | Setiap build di main |
| Ujung ke ujung | Satu siklus 7B: kelas, paket, pindai 5 foto, kelompok, tiga putaran stasiun, kartu keluar | Playwright | Hijau di staging | Setiap build di main |
| Tanpa internet | Pindai, level, kelompok, Alat Nalar dengan mode pesawat, lalu tutup dan buka aplikasi | Uji manual di HP kelas menengah bawah | Tidak ada data hilang atau ganda | Sebelum berkas finalis; uji kelas membawa hotspot |
| Papan | Dua sentuhan, tolak telapak, jeda sentuh, tes sentuhan acak 60 detik | Papan uji dan Tes Kemampuan Papan | Jeda p95 di bawah 0,5 detik; mode dan jawaban tidak berubah karena sentuhan acak | Sebelum uji kelas |
| Kelas | 1 sampai 2 sesi penuh, utamakan kelas 7; SD dan SMA bila izinnya didapat | Protokol di bawah | Lihat protokol | 19 sampai 23 Okt |
| Kriteria PRD lainnya | Batas waktu tiap langkah (3, 5, dan 30 detik), akses antar-akun, kontras warna, keterbacaan dari bangku belakang, pengisian kartu oleh siswa kelas 4, lama cek lisan | Daftar periksa manual; tes RLS dua akun di CI | Semua butir dicentang; angka ditulis dari hasil ukur | Sebelum berkas finalis |

**Protokol uji di kelas:**

1. Izin tertulis kepala sekolah dan formulir persetujuan orang tua atau wali, sebelum hari uji.
2. Guru kelas yang menjalankan sesi; tim hanya mengamati dan tidak mengambil alih.
3. Pengamat mencatat: lama tiap fase, jumlah siswa yang pernah menjadi Pilot, sentuhan yang gagal atau salah terbaca, kejadian siswa malu atau enggan maju, dan kendala guru.
4. Wawancara guru 15 menit setelah sesi: apa yang membingungkan, berapa lama persiapan, dan apakah mau memakai lagi minggu depan. Kesediaan membayar harga uji ditanyakan ke kepala sekolah atau wakasek, beserta pos anggarannya.
5. Yang dilaporkan hanya yang diukur. Kenaikan hasil belajar tidak diklaim dari 1 sampai 2 sesi.

## Skenario demo

Demo final memakai data seed kelas 7B (32 siswa) supaya hasilnya sama setiap kali, lalu satu bagian dibuat hidup: juri diminta menjadi Pilot di papan. Skenario ini dirancang 6 menit dan dipangkas mengikuti batas waktu dari panitia.

| Menit | Yang ditunjukkan | Di HP | Di papan | Yang dikatakan |
| --- | --- | --- | --- | --- |
| 0:00 | Mulai sesi | Beranda, lalu Mulai sesi | Pasangan terhubung | "Guru cukup tiga ketukan." |
| 0:30 | Pembuka Bermakna | Kendali Sesi | Lift dari B2 ke lantai 5; minta juri menebak | "Siswa menebak dulu sebelum menghitung." |
| 1:15 | Cek level | Kendali Sesi | Satu soal cek level dengan pilihan "?" | "Siswa tidak memakai HP. Pilihan '?' supaya tidak menebak." |
| 1:45 | Pindai | Pindai 3 Kartu Nalar asli (absen 07 dan dua lainnya); 29 kartu lain dari seed | Pertanyaan lanjutan pembuka | "Pembacaan kartu terjadi di HP, tanpa internet." |
| 2:30 | Kelompok | Kelompok: Segitiga Biru D1 (7), Lingkaran Oranye D2 (13), Kotak Hijau D3 dan D4 (12), dengan alasannya | Kartu kelompok dan stasiun pertama | "Level hanya ada di HP guru. Di papan hanya bentuk dan warna." |
| 3:00 | Putaran 1: Stasiun Guru | Bisik untuk Segitiga Biru: miskonsepsi D1.2, 3 pertanyaan pemantik | Kotak Hijau mengerjakan Tabel Rasio | "AI membisiki guru, bukan menjawabkan siswa." |
| 3:30 | Putaran 2: Stasiun Papan | Akhiri putaran di Kendali Stasiun; nomor Pilot tampil | Juri menjadi Pilot Segitiga Biru: Tebak Dulu −3 − 5 di Garis Bilangan Lompat | "Siswa menebak dulu, lalu model menunjukkan hasilnya." |
| 4:15 | Putaran 3: Stasiun Papan | Akhiri putaran | Juri tetap menjadi Pilot, kini untuk Lingkaran Oranye: Cari Kesalahan 1/2 + 1/3 dengan Batang Pecahan | "Tidak ada tanda salah. Model memperlihatkan kenapa 2/5 tidak masuk akal." |
| 4:45 | Kartu keluar dua tingkat | Kendali Sesi | Baris 2 "Kenapa?" untuk tiga kelompok | "Jawaban benar dengan alasan keliru dihitung belum paham." |
| 5:15 | Kemajuan | Kemajuan kelas, persentase benar dan paham | Refleksi | "Minggu depan kelompok berubah mengikuti data." |
| 5:40 | Tanpa internet | Nyalakan mode pesawat, pindai satu kartu | Tidak dipakai | "Inti aplikasi tetap jalan." |

**Cadangan bila sesuatu gagal di panggung:**

| Kejadian | Cadangan |
| --- | --- |
| Tidak ada layar sentuh di ruang final | Alat Nalar dijalankan dari HP guru; juri memberi arahan lisan |
| Wifi panitia tidak stabil | Hotspot HP sendiri; Paket Sesi sudah diunduh di laptop Layar |
| Kamera gagal membaca kartu karena lampu panggung | Isi manual satu kartu, lalu lanjut dengan data seed |
| Aplikasi macet | Rekaman layar demo yang sama, disiapkan di laptop dan flashdisk |

## Naskah video

Naskah ini 3 menit. Batas durasi dan format video belum ada di dokumen ini, jadi cek juknis dulu; kalau batasnya lebih pendek, adegan 5 yang dipersingkat. Di video penyisihan, layar yang belum jalan diberi label "desain".

| Waktu | Adegan | Narasi | Di layar |
| --- | --- | --- | --- |
| 0:00 sampai 0:15 | Kelas biasa, guru menulis soal di papan interaktif yang dipakai seperti proyektor | "Di satu kelas 7, ada siswa yang siap belajar aljabar, dan ada yang masih bingung mengurangi bilangan negatif." | Teks: PISA 2025, hanya 17% siswa Indonesia mencapai Level 2 matematika |
| 0:15 sampai 0:35 | Guru bingung harus mulai dari mana | "Pada data 2014, kemampuan numerasi rata-rata siswa kelas 7 setara kelas 4 tahun 2000. Kurikulum berjalan lebih cepat dari kemampuan siswa." | Sumber tertulis kecil di pojok: RISE |
| 0:35 sampai 0:50 | Logo PapanNalar | "PapanNalar membantu guru mengajar sesuai level siswa, memakai papan yang sudah ada di sekolah, tanpa HP siswa." | Tagline: Satu papan, setiap siswa belajar di levelnya |
| 0:50 sampai 1:10 | Pembuka lift, siswa menebak | "Setiap sesi dibuka dengan masalah nyata. Siswa menebak dulu, lalu melihat hasilnya." | Layar Pembuka |
| 1:10 sampai 2:10 | Cek level, pindai, kelompok, stasiun | "Lima soal dijawab di kartu kertas. Guru memotret kartu, dan kelompok langsung tampil setelah kartu terakhir dipindai. Lalu kelompok bergiliran: di papan, bersama guru, dan mandiri. Di papan, siswa menggeser dan membagi benda matematika untuk menemukan kenapa sebuah cara benar." | HP Pindai, Layar Kelompok, Layar Stasiun, Garis Bilangan, Batang Pecahan |
| 2:10 sampai 2:30 | Bisik di HP guru | "Saat guru duduk bersama satu kelompok, Bisik memberi pertanyaan pemantik. AI membantu guru; jawaban soal dihitung kode, bukan dikarang AI." | HP Bisik |
| 2:30 sampai 2:45 | Kartu keluar dua tingkat, refleksi | "Di akhir, siswa menjawab soal dan alasannya, lalu menuliskan gunanya." | Layar kartu keluar, Layar Refleksi |
| 2:45 sampai 3:00 | Penutup | "Mengajar sesuai level sudah teruji dalam riset Teaching at the Right Level. PapanNalar membawanya ke papan interaktif yang sudah ada di sekolah." | Tagline dan logo |

Kalimat yang tidak boleh ada di video: "meningkatkan nilai siswa X%", "AI canggih", atau klaim apa pun yang belum diukur.

## Kerangka concept paper

Paper maksimal 8 halaman, dibagi mengikuti bobot rubrik: bagian untuk Inovasi dan Relevansi (30%) mendapat halaman paling banyak. Format (huruf, margin, sampul) mengikuti juknis dan dicek sebelum menulis.

| Bab | Isi | Halaman | Aspek rubrik | Ambil dari tab |
| --- | --- | --- | --- | --- |
| 1. Latar dan masalah | Masalah bersumber: PISA 2025, RISE, Rapor Pendidikan, papan yang dipakai seperti proyektor; kenapa SD sampai SMA | 1 | Inovasi dan Relevansi | PRD bagian 1, dokumen riset |
| 2. Solusi dan alur satu sesi | Tujuh fase, peran HP guru dan papan, diagram alur | 1,5 | Inovasi dan Relevansi; Kemampuan Menjabarkan Ide | PRD bagian 4, Desain Pembelajaran Interaktif |
| 3. Belajar untuk paham | Pembelajaran Mendalam, Alat Nalar, pola interaksi, kartu keluar dua tingkat, contoh 7B | 1,5 | Inovasi dan Relevansi; Kemanfaatan dan Dampak | Desain Pembelajaran Interaktif, Katalog Materi Bermakna |
| 4. Teknologi dan AI yang aman | Tangga Nalar dan BKT, generator soal dan pemeriksa, pembaca kartu offline, apa yang dikerjakan LLM dan apa yang tidak, privasi anak | 1 | Kualitas Kode | Spesifikasi Teknis |
| 5. Desain | Sistem warna, huruf untuk papan, tiga layar kunci | 0,5 | Kualitas UI dan UX | Brand dan Desain, UX dan Layar, kanvas |
| 6. Keberlanjutan | Paket gratis dan berbayar, biaya per kelas, cara sampai ke sekolah, proyeksi dengan asumsi | 1 | Keberlanjutan | Rencana Bisnis |
| 7. Dampak dan rencana uji | Indikator, hasil uji coba bila ada (apa adanya), rencana uji 4 minggu | 0,75 | Kemanfaatan dan Dampak | Rencana Bisnis bagian Dampak, tab ini bagian Rencana uji |
| 8. Penutup dan daftar pustaka | Satu paragraf penutup; hanya sumber yang dibuka | 0,75 | Semua | Semua tab |

Total 8 halaman. Aturan menulis: setiap angka punya sumber atau ditulis "asumsi" atau "target", tidak ada klaim dampak sebelum ada data, dan setiap penyebutan AI menyebut tugasnya secara spesifik.

## Pitch dan pertanyaan juri

Pitch dibuka dengan masalah di satu kelas, dan setiap klaim di slide punya sumber di tab lain. Urutannya:

1. Masalah (30 detik): satu kelas, kemampuan berbeda beberapa tingkat; papan interaktif dipakai seperti proyektor.
2. Bukti bahwa pendekatannya benar (30 detik): TaRL, Mindspark, Tutor CoPilot, dan contoh pembelajaran sesuai level di NTB.
3. Demo (bagian terbesar): skenario di atas.
4. Kenapa bisa bertahan (30 detik): gratis untuk guru, biaya LLM sekitar Rp28.000 sampai Rp44.000 per rombel per tahun, dan pindai, level, serta kelompok jalan tanpa internet.
5. Yang sudah diukur dan yang belum (20 detik): sebut terang hasil uji coba dan batasnya.

| Pertanyaan yang mungkin muncul | Jawaban singkat |
| --- | --- |
| Kenapa tidak memakai HP siswa? | Siswa tidak dianggap punya HP, dan HP di kelas mudah jadi gangguan. Kartu kertas bisa difotokopi, dibaca kamera HP guru, dan tidak butuh internet |
| Bagaimana kalau sekolah tidak punya papan interaktif atau papannya rusak? | Layar Kelas jalan di proyektor atau TV. Tanpa sentuhan, Alat Nalar dijalankan dari HP guru. Mode Tanpa Layar berupa lembar cetak direncanakan setelah MVP |
| Apa bedanya dengan Rumah Pendidikan, Plickers, atau Kahoot? | Rumah Pendidikan menyediakan konten; Plickers menilai kuis tanpa mengelompokkan; Kahoot butuh perangkat pemain. PapanNalar mengecek level, mengelompokkan, menyiapkan materi per level, dan membisiki guru |
| Apa yang dikerjakan AI, dan bagaimana mencegah halusinasi? | LLM hanya dipakai untuk tiga hal: menulis cerita soal, menyesuaikan kata-kata kartu strategi, dan menjawab pertanyaan bebas guru di Bisik. Kunci, pengecoh, level, dan kelompok dihitung kode dan dites. Cerita yang angkanya tidak cocok dibuang otomatis |
| Bagaimana data anak dilindungi? | Nama hanya ada di HP guru; server menyimpan ID acak dan nomor absen; papan tidak pernah menampilkan nama atau level; uji coba memakai persetujuan orang tua sesuai UU 27/2022 Pasal 25 |
| Apa buktinya siswa jadi lebih paham? | Belum ada bukti dari PapanNalar sendiri, dan kami tidak mengklaimnya. Dasarnya riset TaRL dan manipulatif virtual. Uji 4 minggu dengan kelas pembanding direncanakan setelah lomba |
| Apakah guru punya waktu? | Satu sesi per minggu, persiapan satu ketukan, dan cek level sekitar 10 menit. Uji coba mengukur apakah guru bisa menjalankan sesi tanpa bantuan tim |
| Siapa yang membayar? | Guru gratis. Sekolah membayar Rp100.000 per rombel per tahun untuk fitur AI dan laporan; dinas membeli untuk sekolah negeri. Harga ini harga uji |
| Bagaimana kalau internet mati? | Pindai, level, kelompok, dan Alat Nalar tetap jalan. Yang butuh internet hanya menyambungkan HP ke papan dan fitur LLM |
| Apakah siswa di kelompok bawah tidak malu? | Kelompok diberi nama bentuk dan warna yang diacak tiap sesi, level hanya di HP guru, dan kesalahan yang dibahas di papan selalu milik maskot Nala |
| Kenapa hanya matematika? | Numerasi paling jelas urutan prasyaratnya, dan di PISA 2025 matematika adalah bidang dengan siswa Indonesia paling sedikit mencapai Level 2 (16,9%, dibanding membaca 27,1%). Mesin yang sama bisa dipakai untuk literasi setelah MVP |
| Kelas 40 siswa bagaimana? | Kelompok besar dibagi menjadi dua tim yang bergantian maju; di papan paling banyak 4 siswa berdiri, sisanya menebak di buku |
| Spesifikasi papan tiap sekolah berbeda, bagaimana? | Tes Kemampuan Papan sekitar 1 menit saat pertama dipakai; aplikasi menyesuaikan diri dengan hasilnya |
| Apakah sesuai kurikulum? | Tangga Nalar diambil dari Capaian Pembelajaran Fase A sampai E (BSKAP 046/H/KR/2025), dan struktur sesinya mengikuti Pembelajaran Mendalam: memahami, mengaplikasi, merefleksi |
