import { createNameRepository } from "../../src/local/names";
import { createStudentRepository } from "../../src/local/db";
import { readTeacherStudentView } from "../../src/features/guru/student-view";
import { serializeStudent } from "../../src/contracts/api";
import { serializeBoardState } from "../../src/contracts/board";
import { auditShellCache } from "../../src/offline/shell-cache";
import {
  libraryCache,
  pendingLibraryResponses,
  queueLibraryResponse,
  syncLibraryResponses,
} from "../../src/local/library";
import { classPresence } from "../../src/local/class-presence";
import { boardToolProgress } from "../../src/local/library-board-progress";
import { lockLocalAccess, readLocalAccess } from "../../src/local/access";

const fixture = {
  createNameRepository,
  createStudentRepository,
  readTeacherStudentView,
  serializeStudent,
  serializeBoardState,
  auditShellCache,
  libraryCache,
  pendingLibraryResponses,
  queueLibraryResponse,
  syncLibraryResponses,
  classPresence,
  boardToolProgress,
  lockLocalAccess,
  readLocalAccess,
};
declare global {
  interface Window {
    __privacyFixture: typeof fixture;
  }
}
// Injected only by Playwright; never a public asset, app route or production hook.
window.__privacyFixture = fixture;
