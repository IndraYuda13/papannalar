import { CollectionsPage } from "@/features/library/collections";
import { randomIdSchema } from "@/contracts/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const saved = randomIdSchema.safeParse(q.saved);
  return (
    <CollectionsPage
      key={`${q.tab === "teacher" ? "teacher" : "system"}:${saved.success ? saved.data : ""}`}
      initialTab={q.tab === "teacher" ? "teacher" : "system"}
      savedId={saved.success ? saved.data : undefined}
    />
  );
}
