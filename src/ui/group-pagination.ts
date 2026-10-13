export const GROUP_PAGE_SIZE = 4;

export type GroupPage<T> = {
  page: number;
  pageCount: number;
  items: T[];
  start: number;
  end: number;
  total: number;
};

export function paginateGroups<T>(
  groups: readonly T[],
  requestedPage: number,
  pageSize: number = GROUP_PAGE_SIZE,
): GroupPage<T> {
  const size =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : GROUP_PAGE_SIZE;
  const total = groups.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  return { page, pageCount, items: groups.slice(start, end), start, end, total };
}
