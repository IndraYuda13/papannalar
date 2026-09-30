import { Brand } from "@/ui/components/brand";
import { FullscreenButton } from "@/features/layar/fullscreen-button";
import { BoardWorkspace } from "./board-workspace";
export function BoardShell() {
  return (
    <div
      data-surface="layar"
      className="board-surface flex min-h-dvh flex-col font-kelas"
    >
      <a className="skip-link" href="#konten">
        Langsung ke isi
      </a>
      <header className="flex items-center justify-between gap-6 border-b border-pn-ink-400/30 px-8 py-4">
        <Brand large />
        <span className="text-[28px] text-muted-foreground">Layar Kelas</span>
      </header>
      <main
        id="konten"
        className="mx-auto flex w-full max-w-[1840px] flex-1 flex-col items-center justify-center px-10 py-6 text-center"
      >
        <BoardWorkspace />
      </main>
      <footer className="flex justify-center px-8 pb-4">
        <FullscreenButton />
      </footer>
    </div>
  );
}
