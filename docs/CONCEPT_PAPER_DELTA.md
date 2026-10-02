# Catatan perubahan concept paper - JANGAN otomatis jadi klaim implementasi

DOCX concept paper terakhir tidak diubah pada paket ini. Diagram/alur yang sudah
benar tidak perlu diganti hanya karena skin UI/provider berubah. Teks berikut
baru boleh diterapkan setelah Codex melaporkan implementasi dan hasil pengujian
actual; jangan menyebutnya fitur sudah jadi hari ini.

## Calon paragraf desain (setelah UI lulus)

Antarmuka PapanNalar memisahkan pekerjaan guru ke dalam halaman kelas, kumpulan
soal, sesi mengajar, dan hasil penilaian. Perubahan visual menekankan hierarki
informasi dan petunjuk tindakan. Ilustrasi tiga dimensi dipakai pada pengenalan
produk dan alat, sedangkan model matematika tetap disajikan secara jelas agar
ukuran dan nilai dapat dibandingkan. Efek gerak dapat dikurangi; tampilan tetap
dapat digunakan tanpa dukungan grafis tiga dimensi.

## Calon paragraf teknologi (setelah adapter+ledger lulus)

Bantuan mengajar dihubungkan melalui dua protokol: OpenAI Chat Completions dan
Anthropic Messages. Pengelola dapat menentukan endpoint dan model tanpa mengubah
mesin penghitungan matematika. Respons tetap diperiksa menurut aturan konten,
privasi, dan batas pemakaian. Ketika layanan tidak tersedia, guru memperoleh
panduan tersimpan. Dukungan protokol tidak berarti seluruh model atau endpoint
pihak ketiga sudah diuji.

## Yang harus tetap dibedakan

Diuji mock/local vs layanan asli; kesiapan config vs approval; cost reservation vs
invoice vendor; 3D dekoratif vs alat matematika; contoh fiktif vs data kelas nyata.
Harga Haiku pada proyeksi lama bukan harga semua endpoint/model. Jangan menghapus
bagian keterbatasan atau menyatakan '100% compatible' untuk memperindah naskah.
