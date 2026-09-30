"use client";
import { Brand } from "@/ui/components/brand";
import { Button } from "@/ui/components/button";
import { FullscreenButton } from "@/features/layar/fullscreen-button";
import { BoardWorkspace } from "./board-workspace";
import {
  BoardAppearanceProvider,
  useBoardAppearance,
} from "./appearance-context";
import { AppearanceEditor } from "./appearance-editor";
export function BoardShell() {
  return (
    <BoardAppearanceProvider>
      <BoardSurface />
    </BoardAppearanceProvider>
  );
}
function BoardSurface() {
  const appearance = useBoardAppearance();
  const active = appearance.editing ? appearance.draft : appearance.profile;
  return (
    <div
      data-surface="layar"
      data-board-preset={active?.settings.preset ?? "balanced"}
      data-interaction-zone={active?.settings.interactionZone ?? "auto"}
      className="board-surface font-kelas"
    >
      <a className="skip-link" href="#konten">
        Langsung ke isi
      </a>
      <header className="board-header">
        <Brand />
        <span className="board-display-name">
          {active?.displayName || "Layar Kelas"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!appearance.ready || appearance.editing}
            onClick={appearance.openAppearance}
          >
            Ubah tampilan
          </Button>
          <FullscreenButton />
        </div>
      </header>
      <main id="konten" className="board-main">
        {!appearance.ready && <p role="status">Menyiapkan layar…</p>}
        {appearance.editing && <AppearanceEditor />}
        {appearance.ready && !appearance.firstUse && (
          <div className="board-workspace-region" hidden={appearance.editing}>
            <BoardWorkspace />
          </div>
        )}
        {appearance.notice && (
          <p className="board-profile-notice" role="status">
            {appearance.notice}
          </p>
        )}
      </main>
    </div>
  );
}
