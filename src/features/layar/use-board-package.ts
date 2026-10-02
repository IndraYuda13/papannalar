"use client";
import { useEffect, useRef, useState } from "react";
import type { BoardPackage, BoardPacket } from "@/contracts/board-package";
import {
  publicPresentation,
  type PresentationEnvelope,
  type PresentationState,
} from "@/contracts/presentation";
import { boardPackageCache } from "@/offline/board-package-cache";
import {
  contentCall,
  ContentTransportError,
} from "@/features/classroom/content-transport";
import { packagePages, currentPackagePage } from "./package-navigation";

type LocalView = {
  binding: string;
  payload: PresentationState;
  packetVersion: number;
  stale?: boolean;
};
export function useBoardPackage(envelope: PresentationEnvelope | undefined) {
  const [cached, setCached] = useState<BoardPackage>();
  const [packet, setPacket] = useState<{
    binding: string;
    value: BoardPacket;
    version: number;
  }>();
  const [local, setLocal] = useState<LocalView>();
  const [notice, setNotice] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string>();
  const localRef = useRef<LocalView | undefined>(undefined);
  const envelopeRef = useRef(envelope);
  const pendingUncache = useRef<BoardPackage | undefined>(undefined);
  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);
  const id = envelope?.presentationId,
    channelEpoch = envelope?.channelEpoch;
  const binding = id && channelEpoch ? `${id}:${channelEpoch}` : "offline";
  useEffect(() => {
    const db = boardPackageCache();
    let stopped = false;
    void db
      .read()
      .then((value) => {
        if (!stopped) setCached(value);
      })
      .catch(() => {
        if (!stopped)
          setNotice(
            "Cache papan belum tersedia. Paket yang terbuka tetap di memori.",
          );
      });
    return () => {
      stopped = true;
      db.close();
    };
  }, []);
  useEffect(() => {
    if (!id || !channelEpoch) return;
    const controller = new AbortController(),
      db = boardPackageCache();
    let busy = false,
      knownVersion = 0,
      proposed: string | undefined;
    const key = `${id}:${channelEpoch}`;
    async function poll() {
      if (busy || !navigator.onLine || controller.signal.aborted) return;
      busy = true;
      try {
        const currentPackage = envelopeRef.current?.payload.package;
        if (pendingUncache.current) {
          const removed = pendingUncache.current;
          if (
            removed.content.id === currentPackage?.id &&
            removed.content.revision === currentPackage?.revision
          )
            await contentCall(
              "board",
              {
                action: "uncache",
                presentationId: id!,
                channelEpoch: channelEpoch!,
                packageId: removed.content.id,
                revision: removed.content.revision,
              },
              controller.signal,
            );
          pendingUncache.current = undefined;
        }
        const activeLocal =
          localRef.current?.binding === key &&
          localRef.current.payload.package?.id === currentPackage?.id &&
          localRef.current.payload.package?.revision ===
            currentPackage?.revision
            ? localRef.current
            : undefined;
        const value = await contentCall(
          "board",
          activeLocal &&
            activeLocal.packetVersion > 0 &&
            proposed !== activeLocal.payload.taskEpoch
            ? {
                action: "propose",
                packetVersion: activeLocal.packetVersion,
                presentationId: id!,
                channelEpoch: channelEpoch!,
                payload: activeLocal.payload,
              }
            : {
                action: "read",
                presentationId: id!,
                channelEpoch: channelEpoch!,
                knownVersion,
              },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (activeLocal && activeLocal.packetVersion > 0)
          proposed = activeLocal.payload.taskEpoch;
        if (value.packet) {
          knownVersion = value.packetVersion;
          setPacket({
            binding: key,
            value: value.packet,
            version: value.packetVersion,
          });
          // A cached anonymous view selected before first transfer has no group binding to invalidate.
          if (
            activeLocal &&
            activeLocal.packetVersion === 0 &&
            activeLocal.payload.groups.length === 0
          ) {
            const bound = {
              ...activeLocal,
              packetVersion: value.packetVersion,
            };
            localRef.current = bound;
            setLocal(bound);
          }
          try {
            await db.save(value.packet.content);
            if (controller.signal.aborted) return;
            setCached(value.packet.content);
            await contentCall(
              "board",
              {
                action: "cached",
                presentationId: id!,
                channelEpoch: channelEpoch!,
                packageId: value.packet.content.content.id,
                revision: value.packet.content.content.revision,
              },
              controller.signal,
            );
            if (!controller.signal.aborted)
              setNotice(
                "Paket tersimpan untuk offline. Daftar kelompok hanya di memori.",
              );
          } catch {
            if (!controller.signal.aborted)
              setNotice(
                "Paket siap di memori; cache gagal. Jangan tutup tab saat offline.",
              );
          }
        }
        const now = localRef.current;
        if (
          value.resolution &&
          now?.binding === key &&
          now.payload.taskEpoch === value.resolution.epoch &&
          (envelopeRef.current?.revision ?? 0) >= value.resolution.revision
        ) {
          localRef.current = undefined;
          setLocal(undefined);
          setNotice("Pilihan guru diterapkan. Kendali HP aktif kembali.");
        }
      } catch (error) {
        if (
          error instanceof ContentTransportError &&
          error.status === 409 &&
          localRef.current?.binding === key
        ) {
          const stale = { ...localRef.current, stale: true };
          proposed = stale.payload.taskEpoch;
          localRef.current = stale;
          setLocal(stale);
        }
        // The displayed model/content remains in RAM; no navigation command outbox.
      } finally {
        busy = false;
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      controller.abort();
      clearInterval(timer);
      db.close();
      localRef.current = undefined;
      setLocal(undefined);
      setPacket(undefined);
    };
  }, [id, channelEpoch]);
  const reference = envelope?.payload.package;
  const matching = (content: BoardPackage | undefined) =>
    !envelope ||
    (reference &&
      content?.content.id === reference.id &&
      content.content.revision === reference.revision);
  const currentPacket =
    packet?.binding === binding && matching(packet.value.content)
      ? packet.value
      : undefined;
  const content =
    currentPacket?.content ?? (matching(cached) ? cached : undefined);
  const state =
    local?.binding === binding &&
    (!envelope ||
      (local.payload.package?.id === reference?.id &&
        local.payload.package?.revision === reference?.revision))
      ? local.payload
      : undefined;
  const plan = currentPacket?.plan;
  const pages = content
    ? packagePages(
        content,
        plan,
        content.content.id,
        content.content.activities.some((a) => a.id === selectedActivity)
          ? selectedActivity
          : undefined,
      )
    : [];
  const index = currentPackagePage(pages, state ?? envelope?.payload);
  function select(index: number) {
    const page = pages[index];
    if (!page) return;
    const value = {
      binding,
      packetVersion: packet?.binding === binding ? packet.version : 0,
      payload: publicPresentation({
        ...page.state,
        taskEpoch: crypto.randomUUID(),
      }),
    };
    localRef.current = value;
    setLocal(value);
  }
  function chooseActivity(id: string) {
    if (!content) return;
    setSelectedActivity(id);
    const choices = packagePages(content, undefined, crypto.randomUUID(), id);
    const value = {
      binding,
      packetVersion: packet?.binding === binding ? packet.version : 0,
      payload: choices.find((p) => p.state.mode === "station")!.state,
    };
    localRef.current = value;
    setLocal(value);
  }
  async function clearCache() {
    const db = boardPackageCache();
    try {
      await db.clear();
      if (content && envelope) pendingUncache.current = content;
      setCached(undefined);
      setNotice("Cache konten dihapus.");
    } catch {
      setNotice("Cache belum dapat dihapus. Coba lagi dari menu papan.");
    } finally {
      db.close();
    }
  }
  return {
    content,
    plan,
    state,
    stale: local?.binding === binding && local.stale,
    pages,
    index,
    select,
    chooseActivity,
    clearCache,
    notice,
    selectedActivity: selectedActivity ?? content?.content.activities[0].id,
  };
}
