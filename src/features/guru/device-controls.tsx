"use client";
import { useState } from "react";
import type { LocalScope } from "@/local/scope";
import type { ClassDto } from "@/contracts/classes";
import { Button } from "@/ui/components/button";
import { ActivityDisclosure, openTeacherActivity } from "./activity-disclosure";
import { SyncControls } from "./sync-controls";
import { StorageStatus } from "./storage-status";

export function DeviceControls({
  scope,
  classroom,
}: {
  scope: LocalScope;
  classroom?: ClassDto;
}) {
  const [storageAttention, setStorageAttention] = useState("");
  const [syncAttention, setSyncAttention] = useState("");
  return (
    <>
      {(storageAttention || syncAttention) && (
        <div
          role="alert"
          className="rounded-input bg-pn-amber-100 p-4 space-y-2"
        >
          <p>{storageAttention || syncAttention}</p>
          <Button
            variant="outline"
            onClick={() => openTeacherActivity("teacher-device")}
          >
            Periksa data tersimpan
          </Button>
        </div>
      )}
      <ActivityDisclosure
        id="teacher-device"
        title="Penyimpanan & internet"
        description="Buka jika perlu menyimpan untuk offline atau memulihkan jawaban."
        scope={scope}
      >
        <SyncControls
          scope={scope}
          classroom={classroom}
          onAttention={setSyncAttention}
        />
        <StorageStatus scope={scope} onAttention={setStorageAttention} />
      </ActivityDisclosure>
    </>
  );
}
