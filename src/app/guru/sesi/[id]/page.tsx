import { SessionPage } from "@/features/library/session";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SessionPage id={(await params).id} />;
}
