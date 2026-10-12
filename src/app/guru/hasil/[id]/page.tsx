import { ResultPage } from "@/features/guru/results";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { id } = await params,
    { source } = await searchParams;
  return (
    <ResultPage
      id={id}
      source={
        source === "group_lesson" || source === "diagnostic"
          ? source
          : "library"
      }
    />
  );
}
