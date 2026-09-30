import { CollectionPage } from "@/features/library/collections";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CollectionPage id={(await params).id} />;
}
