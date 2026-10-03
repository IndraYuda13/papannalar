import type { Page } from "@playwright/test";
import type { TeacherPackage } from "../../src/core/package/build";
export async function readLocalPackage(
  page: Page,
  id?: string,
): Promise<TeacherPackage> {
  return page.evaluate(async (id) => {
    const mode = new URL(location.href).searchParams.get("mode") ?? "demo";
    const name = (await indexedDB.databases()).find((d) =>
      d.name?.startsWith(`pn-data:${mode}:`),
    )?.name;
    if (!name) throw new Error("Local package database unavailable");
    const classId = new URL(location.href).searchParams.get("class");
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () =>
        reject(new Error("Local package database unavailable"));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["localMeta", "packages"]);
        const read = (key: string) => {
          const value = tx.objectStore("packages").get(key);
          value.onsuccess = () =>
            value.result
              ? resolve(value.result)
              : reject(new Error("Package unavailable"));
        };
        if (id) read(id);
        else {
          const pointer = tx
            .objectStore("localMeta")
            .get(`package:class:${classId}`);
          pointer.onsuccess = () =>
            pointer.result
              ? read(pointer.result.value)
              : reject(new Error("Package pointer unavailable"));
        }
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(new Error("Package read failed"));
        };
      };
    });
  }, id);
}
