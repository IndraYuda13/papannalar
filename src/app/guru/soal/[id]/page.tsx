import { CollectionPage } from "@/features/library/collections";
import { randomIdSchema } from "@/contracts/domain";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [p, q] = await Promise.all([params, searchParams]);
  const from = randomIdSchema.safeParse(q.from);
  return (
    <CollectionPage id={p.id} fromId={from.success ? from.data : undefined} />
  );
}
