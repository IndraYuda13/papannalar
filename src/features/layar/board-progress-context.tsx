"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { LibraryBoardState } from "@/contracts/library";

/**
 * The board's library binding, lifted to a shared source (L1).
 *
 * `LibraryBoard` resolves the bound library item from `/api/v1/board/library` and prints its own
 * `Soal {position+1}/{total}` header. The footer rail lives one level up in the workspace and had
 * no way to read those numbers, so on the library path it fell back on the package page count —
 * which is zero there. This provider is the missing wire: the library renderer publishes the same
 * object it renders from, and the rail resolves the position and the total from it.
 *
 * `undefined` means "not resolved yet"; `null` means "resolved, and there is no library run bound".
 * The distinction matters: a rail must not paint for an unbound board, and must not claim zero
 * questions while the fetch is still in flight.
 */
type BoardProgressSource = {
  library?: LibraryBoardState | null;
  publish: (value: LibraryBoardState | null) => void;
};
const Context = createContext<BoardProgressSource>({
  publish: () => undefined,
});

export function BoardProgressProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<LibraryBoardState | null | undefined>(
    undefined,
  );
  return (
    <Context.Provider value={{ library, publish: setLibrary }}>
      {children}
    </Context.Provider>
  );
}

/** The rail's read side. */
export function useBoardProgressSource() {
  return useContext(Context);
}

/** The library renderer's write side. */
export function useBoardProgressPublisher() {
  return useContext(Context).publish;
}
