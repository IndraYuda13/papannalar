# PapanNalar - checklist sebelum mengambil video

Dokumen ini adalah daftar pemeriksaan, bukan bukti aplikasi telah lulus.
Gunakan bersama `PapanNalar_Video_Ready_Codex.md`. Semua data rekaman adalah fiktif.

## 1. Empat adegan yang harus dapat dilakukan

### Adegan A - Guru memakai soal interaktif dari sistem

Buka aplikasi utama -> Coba dengan data contoh -> Kelas 7B -> Mulai mengajar ->
Dari Sistem -> pilih kumpulan interaktif -> Pindai QR papan -> Mulai.

[ ] Tidak ada registrasi; tidak dialihkan ke ruang demo/per-visitor workspace.
[ ] Di HP jelas kelas aktif, nama kumpulan, soal keberapa dan langkah berikutnya.
[ ] Papan menampilkan soal, instruksi dan model bersama tanpa scroll halaman.
[ ] Pada soal lift, marker tidak terlalu besar dan bisa digerakkan dengan nyaman.
[ ] Bilangan negatif/pecahan tampil benar dan model benar-benar interaktif.
[ ] Debug, token, kode level, nama siswa dan log tidak tampil di papan.

### Adegan B - Guru membuat soal dan menggunakannya di dua kelas

Soal & Presentasi -> Soal Saya -> Buat kumpulan -> isi nama -> pilih jenis ->
tambah soal -> preview -> simpan -> Gunakan di kelas 7B -> pakai lagi di 7C.

[ ] Soal interaktif dapat dikonfigurasi lewat field biasa, bukan JSON.
[ ] Ada Garis Bilangan dan Menulis di papan; tulisan tidak disimpan/dikirim.
[ ] Soal kartu memiliki A/B/C/D, satu kunci, dan opsi Belum tahu otomatis.
[ ] Kembali dari preview tidak menghapus input.
[ ] Kumpulan ada setelah reload, tidak terkunci ke satu kelas.
[ ] Penggunaan di 7C tidak mengubah hasil atau versi yang sudah dipakai 7B.

### Adegan C - Guru menampilkan soal, memindai dan membuka rekap

Asesmen & Hasil -> Buat asesmen -> pilih kelas, kumpulan, tanggal -> cetak kartu ->
tampilkan soal -> pindai jawaban -> buka Hasil -> filter kelas/tanggal/kumpulan.

[ ] Baris kartu dan soal di layar cocok; kartu punya identitas form/halaman yang benar.
[ ] Satu scan ulang tidak menambah bukti; koreksi jawaban mengganti revisi lama.
[ ] Status Belum masuk berbeda dari Belum tahu.
[ ] Hasil tersimpan di DB, bukan hanya React state/local adapter.
[ ] Setelah reload/relogin, hasil yang sama masih bisa ditemukan.
[ ] Rincian per siswa menampilkan absen dan nama lokal yang sesuai.
[ ] Filter hasil kelas 7B tidak menampilkan data 7C.
[ ] Tidak ada klaim bahwa nilai/data contoh berasal dari siswa/pilot nyata.

### Adegan D - Sambungan putus dan dilanjutkan

Saat soal ke-3 sedang tampil -> putuskan jaringan HP sebentar -> amati papan ->
pulihkan koneksi -> jika diperlukan pindai QR ulang -> lanjut soal yang sama.

[ ] HP memberi status putus; papan tidak menutupi materi dengan error teknis.
[ ] Tombol Sambungkan kembali dapat membuka QR bila diperlukan.
[ ] Soal, posisi sesi, putaran dan hasil yang sudah dicatat tidak reset/duplikat.
[ ] Controller lama yang dicabut tidak bisa mengambil alih lagi.
[ ] Logout/Akhiri sesi tidak disamakan dengan jaringan putus sementara.

## 2. Layar dan HP yang dipakai merekam

[ ] Origin yang dipakai HP dan papan sama dan bisa dijangkau; QR bukan localhost PC.
[ ] HTTPS dan izin kamera sudah berfungsi di HP yang akan dipakai, bukan hanya emulator.
[ ] Profil tersimpan: tutup-buka /layar tidak meminta tes ulang terus-menerus.
[ ] Pilihan Ringkas/Seimbang/Besar dibandingkan menggunakan contoh soal yang sama.
[ ] Tes satu/dua/empat sentuhan menunjukkan sukses lalu auto-next dengan benar.
[ ] Mouse/HDMI tidak diklaim lolos multitouch; tersedia lanjut tanpa sentuhan.
[ ] Jika memakai HDMI, kendali HP/mouse berfungsi; jangan mengandalkan input HDMI.
[ ] Browser zoom 100%; font/input guru tidak terpotong saat ukuran sistem dinaikkan.
[ ] Tidak ada scrollbar halaman yang menyembunyikan soal/model/kontrol inti di papan.
[ ] Kumpulan soal rekaman telah dipreview pada layar yang benar-benar akan dipakai.

## 3. Peta semua tambahan pengguna ke acceptance

| Catatan pengguna | Implementasi yang diminta | Bukti sebelum merekam |
| --- | --- | --- |
| 1. Lingkaran lift terlalu besar | Marker proporsional, hit-area terpisah | Screenshot dan drag pada viewport asli |
| 2. Disconnect tidak sinkron | Peer status + reconnect ke sesi yang sama | Adegan D |
| 3. Layar kebesaran | Layout viewport + preset | Papan 720p/768p/1080p |
| 4. Guru sulit dipakai | Empat menu, sesi terpisah, state terjaga | Adegan A/B/C dari entry normal |
| 5. Kata teknis berlebihan | Microcopy ringkas, detail teknis tersembunyi | Cek layar guru/papan tanpa debug |
| 6. Data dummy production tanpa register | Akun contoh persisten, jalur utama dan DB | Reload/relogin, bukan /demo |
| 7. Instruksi tindakan | Prompt menjelaskan klik/geser/tulis/baris kartu | Setiap jenis soal memiliki instruksi |
| 8. Connect lewat QR | QR aman, kode manual cadangan | HP nyata connect + permission denied fallback |
| 9. Pisah fitur beranda | Kelas; Soal & Presentasi; Asesmen & Hasil | Navigasi tidak menumpuk workspace |
| 10. Tes layar otomatis | Feedback terlihat + auto-next sekali | Pointer nyata atau simulasi berlabel |
| 11. Soal sistem/guru | Dua sumber di picker | Adegan A dan B |
| 12. Soal lintas kelas | Set milik guru terpisah dari assignment | Satu set dipakai 7B/7C |
| 13. Authoring dua jenis | Interaktif + kartu ABCD dengan kunci | Preview, simpan, pakai dan rekap |
| Profil layar tetap | Capabilities/appearance persisten | Reload tanpa wizard; Ubah tampilan tersedia |
| Rekap historis | Versi soal/roster binding dan filter | Edit set tidak mengubah hasil lama |

## 4. Yang kritis versus yang bisa dicatat untuk sesudah rekaman

KRITIS sebelum menyebut alur inti siap:
- Tidak bisa masuk aplikasi utama dengan dataset contoh yang diminta.
- QR/reconnect mengganti atau menghapus sesi, atau melanggar izin akses.
- Soal/model/kontrol utama keluar layar, sulit disentuh, atau instruksi salah.
- Kumpulan soal hanya UI kosong/tidak tersimpan/tidak bisa dipakai lintas kelas.
- Kartu dinilai memakai kumpulan/versi yang salah, hasil duplikat, atau tidak masuk DB.
- Kebocoran nama/kunci/token, akses lintas akun, atau perubahan core math yang salah.

BOLEH dicatat tanpa menghambat pekerjaan inti:
- Polesan animasi, ilustrasi tambahan, shadow atau jarak kecil yang tidak mengganggu.
- Full dashboard analitik, billing, koleksi template baru, atau editor bebas.
- Uji pilot/izin/review eksternal yang belum ada, selama data video hanya sintetis
  dan video tidak mengklaim produk telah dipakai/diuji siswa sungguhan.

## 5. Handoff yang diminta dari Codex

Mintalah satu `VIDEO_HANDOFF.md` dengan command start, origin guru/papan, cara masuk
akun contoh, daftar set siap pakai, cara reset HANYA dataset sintetis, serta tabel
PASS/FAIL/NOT_RUN. Bukti otomatis tidak menggantikan tes HP, kamera, printer, atau
multitouch sebenarnya. Ambil video setelah empat adegan di atas dicoba pada
perangkat yang akan digunakan; jangan baru menemukan alurnya saat rekaman.
