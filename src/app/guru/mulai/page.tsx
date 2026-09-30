import { StartLesson } from "@/features/library/start";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  return (
    <StartLesson
      classId={typeof q.class === "string" ? q.class : undefined}
      collectionId={typeof q.collection === "string" ? q.collection : undefined}
      mode={q.mode === "assessment" ? "assessment" : "teach"}
    />
  );
}
