import Dexie, { type Table } from "dexie";
import {
  parseBoardPackage,
  publicBoardPackage,
  type BoardPackage,
} from "../contracts/board-package";

// Separate DB: never import the teacher DB, identities, run plan, or public roster.
type Row = { key: "latest"; content: BoardPackage };
export function boardPackageCache(
  databaseName = "papannalar-board-content-v1",
) {
  const db = new Dexie(databaseName);
  db.version(1).stores({ packages: "key" });
  const table: Table<Row, string> = db.table("packages");
  return {
    async save(input: BoardPackage) {
      // Strict validation before mapping deliberately rejects accidental packet/roster storage.
      const content = publicBoardPackage(parseBoardPackage(input));
      await table.put({ key: "latest", content });
    },
    async read(): Promise<BoardPackage | undefined> {
      const row = await table.get("latest");
      return row
        ? publicBoardPackage(parseBoardPackage(row.content))
        : undefined;
    },
    async clear() {
      await table.clear();
    },
    close() {
      db.close();
    },
  };
}
