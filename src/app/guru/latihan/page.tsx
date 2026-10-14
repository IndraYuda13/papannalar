import { Suspense } from "react";
import { GroupEntry } from "@/features/guru/group-entry";
import { StateNotice } from "@/ui/components/studio";

export const metadata = { title: "Belajar berkelompok" };

export default function Page() {
  return (
    <Suspense
      fallback={<StateNotice kind="loading" title="Memuat kegiatan…" />}
    >
      <GroupEntry />
    </Suspense>
  );
}
