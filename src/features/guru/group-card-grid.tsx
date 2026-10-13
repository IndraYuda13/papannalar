"use client";
import { useState, type ReactNode } from "react";
import { GROUP_PAGE_SIZE, paginateGroups } from "@/ui/group-pagination";
import { Button } from "@/ui/components/button";

export function GroupCardGrid<T extends { id: string }>({
  groups,
  renderCard,
  label,
}: {
  groups: T[];
  renderCard: (group: T, indexInLesson: number) => ReactNode;
  label: string;
}) {
  const [page, setPage] = useState(1);
  const view = paginateGroups(groups, page, GROUP_PAGE_SIZE);
  return (
    <div className="space-y-4">
      <p className="studio-progress-label" role="status">
        <span aria-hidden>
          {view.start + 1}-{view.end}/{view.total}
        </span>
        <span className="sr-only">
          Menampilkan kelompok {view.start + 1} sampai {view.end} dari {view.total}
        </span>
      </p>
      <ul className="grid gap-5 lg:grid-cols-2" aria-label={label}>
        {view.items.map((group, i) => (
          <li key={group.id}>{renderCard(group, view.start + i)}</li>
        ))}
      </ul>
      {view.pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={view.page === 1}
            onClick={() => setPage(view.page - 1)}
          >
            Kelompok sebelumnya
          </Button>
          <p className="studio-progress-label">
            Halaman {view.page} dari {view.pageCount}
          </p>
          <Button
            variant="outline"
            disabled={view.page === view.pageCount}
            onClick={() => setPage(view.page + 1)}
          >
            Kelompok berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
