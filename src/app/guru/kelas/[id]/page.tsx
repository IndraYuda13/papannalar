import { ClassPage } from "@/features/guru/classes";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ClassPage id={(await params).id} />;
}
