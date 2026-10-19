import { BookOpen, Monitor, UsersRound } from "lucide-react";

export function GroupOrientation() {
  return (
    <section
      className="pn-group-orientation"
      aria-label="Cara belajar kelompok"
    >
      <div>
        <span>
          <UsersRound size={22} aria-hidden />
        </span>
        <h2>Dibimbing guru</h2>
        <p>Bahas strategi dan bantu siswa menemukan langkah berikutnya.</p>
      </div>
      <div>
        <span>
          <Monitor size={22} aria-hidden />
        </span>
        <h2>Menjawab di layar</h2>
        <p>Coba model matematika bersama melalui satu Layar Kelas.</p>
      </div>
      <div>
        <span>
          <BookOpen size={22} aria-hidden />
        </span>
        <h2>Kartu Nalar</h2>
        <p>Gunakan kartu untuk memeriksa pemahaman setiap siswa.</p>
      </div>
    </section>
  );
}
