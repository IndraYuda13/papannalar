"use client";
import { useEffect } from "react";
import { boardIdentitySchema } from "@/contracts/auth";

export function BoardIdentity() {
  useEffect(() => {
    // Device identity only: no pairing, class query or teacher auth client.
    if (navigator.onLine) {
      void fetch("/api/v1/board/identity", {
        method: "POST",
        cache: "no-store",
      })
        .then(async (response) => {
          if (response.ok) boardIdentitySchema.parse(await response.json());
        })
        .catch(() => undefined);
    }
  }, []);
  return null;
}
