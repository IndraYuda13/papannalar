export function teacherSectionForPath(pathname: string) {
  if (/^\/guru\/(?:latihan|simulasi)(?:\/|$)/.test(pathname))
    return "/guru/latihan";
  if (/^\/guru\/kelas(?:\/|$)/.test(pathname)) return "/guru/kelas";
  if (/^\/guru\/soal(?:\/|$)/.test(pathname)) return "/guru/soal";
  if (/^\/guru\/(?:asesmen|hasil)(?:\/|$)/.test(pathname))
    return "/guru/asesmen";
  if (pathname === "/guru/akun") return null;
  return "/guru";
}
