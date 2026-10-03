"use client";
import { useReducer, useRef, useState, type PointerEvent } from "react";
import {
  initialAlgebra,
  reduceAlgebra,
  checkAlgebra,
  type AlgebraAction,
  type AlgebraTask,
  type Tile,
  type AlgebraState,
} from "@/core/tools/algebra";
import type { ToolModel } from "@/core/tools/patterns";
import { PointerOwnership } from "@/core/tools/pointers";
import { ObjectFace } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";
type HeldTile = {
  tile: Tile;
  existing: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
};
export function AlgebraTiles({
  task,
  initial,
  onRun,
}: {
  task: AlgebraTask;
  initial?: AlgebraState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const [state, dispatch] = useReducer(
    reduceAlgebra,
    initial ?? initialAlgebra(),
  );
  const [selectedGroup, setSelectedGroup] = useState(""),
    [selectedTile, setSelectedTile] = useState("");
  const [notice, setNotice] = useState(""),
    [highlight, setHighlight] = useState<readonly number[]>([]);
  const held = useRef(new Map<number, HeldTile>()),
    [ghosts, setGhosts] = useState<HeldTile[]>([]);
  const owners = useRef(new PointerOwnership());
  function act(action: AlgebraAction) {
    try {
      reduceAlgebra(state, action);
      dispatch(action);
      setNotice("");
      setHighlight([]);
    } catch {
      setNotice(
        "Periksa jenis ubin, tandanya, dan kelompoknya. Pasangan nol harus sejenis dengan tanda berlawanan.",
      );
    }
  }
  function add(tile: Tile, groupId = selectedGroup) {
    if (!groupId) {
      setNotice("Buat dan pilih kelompok terlebih dahulu.");
      return;
    }
    act({ type: "add", groupId, tile });
  }
  function select(tileId: string) {
    if (selectedTile && selectedTile !== tileId) {
      act({ type: "cancel", leftId: selectedTile, rightId: tileId });
      setSelectedTile("");
    } else setSelectedTile(tileId);
  }
  function capture(
    e: PointerEvent<HTMLButtonElement>,
    tile: Tile,
    existing: boolean,
  ) {
    if (!owners.current.claim(e.pointerId, tile.id, e.width, e.height)) return;
    held.current.set(e.pointerId, {
      tile,
      existing,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
    });
    if (e.pointerId !== -77) e.currentTarget.setPointerCapture(e.pointerId);
    setGhosts([...held.current.values()]);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const value = held.current.get(e.pointerId);
    if (!value) return;
    held.current.set(e.pointerId, { ...value, x: e.clientX, y: e.clientY });
    setGhosts([...held.current.values()]);
  }
  function release(e: PointerEvent<HTMLButtonElement>) {
    const value = held.current.get(e.pointerId);
    if (!value) return;
    held.current.delete(e.pointerId);
    owners.current.release(e.pointerId);
    setGhosts([...held.current.values()]);
    const target = document.elementFromPoint(e.clientX, e.clientY),
      groupId = target?.closest<HTMLElement>("[data-algebra-group]")?.dataset
        .algebraGroup;
    const otherId = target?.closest<HTMLElement>("[data-algebra-tile]")?.dataset
      .algebraTile;
    if (Math.hypot(e.clientX - value.startX, e.clientY - value.startY) < 6) {
      if (value.existing) select(value.tile.id);
      else add(value.tile);
    } else if (value.existing && otherId && otherId !== value.tile.id) {
      act({ type: "cancel", leftId: value.tile.id, rightId: otherId });
    } else if (groupId) {
      if (value.existing) act({ type: "move", tileId: value.tile.id, groupId });
      else add(value.tile, groupId);
    }
  }
  function cancel(e: PointerEvent<HTMLButtonElement>) {
    held.current.delete(e.pointerId);
    owners.current.release(e.pointerId);
    setGhosts([...held.current.values()]);
  }
  const palette: readonly Omit<Tile, "id">[] = [
    { kind: "x", sign: 1 },
    { kind: "unit", sign: 1 },
    { kind: "x", sign: -1 },
    { kind: "unit", sign: -1 },
  ];
  const label = (tile: Omit<Tile, "id">) =>
    `${tile.sign < 0 ? "−" : "+"}${tile.kind === "x" ? "x" : "1"}`;
  return (
    <section
      aria-label="Ubin Aljabar"
      data-tool="algebra"
      className="board-tool space-y-4 text-left"
    >
      <p className="text-[32px]">
        Pilih kelompok. Ketuk atau seret ubin ke dalamnya. Pasangkan ubin + dan
        − sejenis untuk membuat nol.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          size="board"
          disabled={state.groups.length >= 6}
          onClick={() => {
            const id = crypto.randomUUID();
            act({ type: "group", id });
            setSelectedGroup(id);
          }}
        >
          Tambah kelompok
        </Button>
        {palette.map((tile) => (
          <Button
            size="board"
            key={label(tile)}
            className={`touch-none ${tile.sign < 0 ? "border-4 border-dashed border-primary bg-pn-amber-100 text-pn-ink-900" : ""}`}
            aria-label={`Tambah ubin ${label(tile)}`}
            onPointerDown={(e) =>
              capture(e, { ...tile, id: crypto.randomUUID() }, false)
            }
            onPointerMove={move}
            onPointerUp={release}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onClick={(e) => {
              if (e.detail === 0) add({ ...tile, id: crypto.randomUUID() });
            }}
          >
            <ObjectFace />
            {label(tile)}
          </Button>
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto py-3">
        {state.groups.map((group, i) => (
          <div
            key={group.id}
            data-algebra-group={group.id}
            className={`min-h-48 w-52 shrink-0 rounded-kartu border-4 p-2 ${highlight.includes(i) ? "border-dashed border-primary" : selectedGroup === group.id ? "border-primary" : "border-pn-ink-400"}`}
          >
            <Button
              size="board"
              variant="outline"
              className="mb-3 w-full px-1"
              onClick={() => setSelectedGroup(group.id)}
            >
              Kelompok {i + 1}
            </Button>
            <div className="grid grid-cols-2 gap-1">
              {group.tiles.map((tile) => (
                <button
                  key={tile.id}
                  data-algebra-tile={tile.id}
                  aria-label={`Ubin ${label(tile)} kelompok ${i + 1}`}
                  className={`algebra-tile size-[88px] touch-none rounded-input border-2 text-[40px] ${tile.sign < 0 ? "border-dashed bg-pn-amber-100" : "bg-primary text-white"} ${selectedTile === tile.id ? "outline-4 outline-pn-amber-500" : ""}`}
                  onPointerDown={(e) => capture(e, tile, true)}
                  onPointerMove={move}
                  onPointerUp={release}
                  onPointerCancel={cancel}
                  onLostPointerCapture={cancel}
                  onClick={(e) => {
                    if (e.detail === 0) select(tile.id);
                  }}
                >
                  {label(tile)}
                  <ObjectFace />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {ghosts.map((ghost) => (
        <div
          aria-hidden
          key={ghost.tile.id}
          className="pointer-events-none fixed z-50 flex size-[88px] items-center justify-center rounded-input border-4 border-primary bg-pn-teal-100 text-[40px] opacity-80"
          style={{ left: ghost.x - 44, top: ghost.y - 44 }}
        >
          {label(ghost.tile)}
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          size="board"
          variant="outline"
          onClick={() => {
            act({ type: "undo" });
            setSelectedTile("");
          }}
        >
          Ulang langkah
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => {
            act({ type: "reset" });
            setSelectedGroup("");
            setSelectedTile("");
          }}
        >
          Mulai ulang
        </Button>
        <Button
          size="board"
          onClick={() => {
            const checked = checkAlgebra(state, task);
            const matches =
              onRun?.({ kind: "algebra", state }) ?? checked.modelMatches;
            setHighlight(checked.mismatchedGroups);
            setNotice(
              matches
                ? `Model sudah sesuai: ${checked.total.x}x ${checked.total.constant < 0 ? "−" : "+"} ${Math.abs(checked.total.constant)}. Mengapa setiap kelompok mendapat bagian yang sama?`
                : "Periksa jumlah kelompok dan isi setiap kelompok.",
            );
          }}
        >
          Jalankan
        </Button>
      </div>
      <p role="status" className="min-h-14 text-[40px] text-primary">
        {notice}
      </p>
    </section>
  );
}
