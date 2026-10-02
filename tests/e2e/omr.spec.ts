import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { loginTeacher } from "../browser/helpers";

test("real worker scans pixels/printed text, stays local and works offline after reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    imageRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      r.method() !== "GET" &&
      /image\/|multipart/.test(r.headers()["content-type"] ?? "")
    )
      imageRequests.push(r.url());
  });
  await loginTeacher(page);
  const script = await readFile(".browser-tests/omr-fixture.js", "utf8");
  await page.addScriptTag({ content: script });
  const printed = await page.evaluate(() =>
    window.__omrFixture.printedPhoto(7, ["A", "C", "B", "?", "D"]),
  );
  expect(printed).toMatchObject({ status: "accepted", attendanceNumber: 7 });
  expect(printed.answers.map((a) => a.result)).toEqual([
    "A",
    "C",
    "B",
    "?",
    "D",
  ]);
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  await expect
    .poll(() => page.evaluate(() => window.__omrFixture.auditShellCache()))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.addScriptTag({ content: script });
  const offline = await page.evaluate(() =>
    window.__omrFixture.scan({
      kind: "weekly",
      attendance: 25,
      answers: ["B", "A", "C", "D", "?"],
      rotation: 1,
      skew: 8,
    }),
  );
  expect(offline).toMatchObject({ status: "accepted", attendanceNumber: 25 });
  expect(offline.answers.map((a) => a.result)).toEqual([
    "B",
    "A",
    "C",
    "D",
    "?",
  ]);
  expect(Object.keys(offline)).toEqual([
    "status",
    "kind",
    "attendanceNumber",
    "answers",
    "issues",
  ]);
  expect(errors).toEqual([]);
  expect(imageRequests).toEqual([]);
});
