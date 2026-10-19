import { CollectionsPage } from "@/features/library/collections";
import { randomIdSchema } from "@/contracts/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const saved = randomIdSchema.safeParse(q.saved);
  const tab =
    q.tab === "teacher" ? "teacher" : q.tab === "all" ? "all" : "system";
  return (
    <CollectionsPage
      key={`${tab}:${saved.success ? saved.data : ""}:${typeof q.q === "string" ? q.q.slice(0, 120) : ""}`}
      initialTab={tab}
      savedId={saved.success ? saved.data : undefined}
      initialQuery={typeof q.q === "string" ? q.q.slice(0, 120) : ""}
    />
  );
}
