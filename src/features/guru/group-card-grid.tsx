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
          Menampilkan kelompok {view.start + 1} sampai {view.end} dari{" "}
          {view.total}
        </span>
      </p>
      <ul className="grid gap-5 lg:grid-cols-2" aria-label={label}>
        {view.items.map((group, i) => (
          <li key={group.id}>{renderCard(group, view.start + i)}</li>
        ))}
      </ul>
      {view.pageCount > 1 && (
        // Mobile: the counter takes its own line, the button pair shares the next
        // one, left aligned. sm+: a single centred row with the counter between the
        // buttons. The compact sizing is what keeps both labels on one line at 360.
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-center sm:gap-3">
          <Button
            className="order-1 px-2 text-[13px] sm:px-5 sm:text-base"
            variant="outline"
            disabled={view.page === 1}
            onClick={() => setPage(view.page - 1)}
          >
            Kelompok sebelumnya
          </Button>
          <p className="studio-progress-label order-first w-full sm:order-2 sm:w-auto">
            Halaman {view.page} dari {view.pageCount}
          </p>
          <Button
            className="order-3 px-2 text-[13px] sm:px-5 sm:text-base"
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
