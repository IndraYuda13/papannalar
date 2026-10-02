import { ResultPage } from "@/features/guru/results";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ResultPage id={(await params).id} />;
}
