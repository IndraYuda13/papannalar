type Discoverable = {
  source: "system" | "teacher";
  status: "draft" | "ready" | "archived";
  document: { title: string; kind: "cards" | "interactive" };
};

export function findCollections<T extends Discoverable>(
  collections: readonly T[],
  source: T["source"] | "all",
  query: string,
): T[] {
  const term = query.trim().toLocaleLowerCase("id");
  return collections.filter((collection) => {
    if (
      (source !== "all" && collection.source !== source) ||
      collection.status === "archived"
    )
      return false;
    const type =
      collection.document.kind === "cards"
        ? "Kartu Nalar"
        : "Interaktif di layar";
    return `${collection.document.title} ${type}`
      .toLocaleLowerCase("id")
      .includes(term);
  });
}
