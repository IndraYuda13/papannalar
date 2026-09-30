import { createNameRepository } from "../../src/local/names";
import { createStudentRepository } from "../../src/local/db";
import { readTeacherStudentView } from "../../src/features/guru/student-view";
import { serializeStudent } from "../../src/contracts/api";
import { serializeBoardState } from "../../src/contracts/board";
import { auditShellCache } from "../../src/offline/shell-cache";

const fixture = {
  createNameRepository,
  createStudentRepository,
  readTeacherStudentView,
  serializeStudent,
  serializeBoardState,
  auditShellCache,
};
declare global {
  interface Window {
    __privacyFixture: typeof fixture;
  }
}
// Injected only by Playwright; never a public asset, app route or production hook.
window.__privacyFixture = fixture;
