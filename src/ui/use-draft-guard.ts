"use client";
import { useEffect } from "react";
import { confirmAction } from "@/ui/components/confirm";

export function useDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.dataset["draftGuardAllowed"] === "true"
      )
        return;
      const next = new URL(anchor.href);
      if (
        next.pathname === location.pathname &&
        next.search === location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void confirmAction({
        title: "Tinggalkan halaman ini?",
        consequence:
          "Perubahan yang belum disimpan di halaman ini akan hilang. Isian yang sudah tersimpan tetap aman.",
        confirmLabel: "Tinggalkan halaman",
        cancelLabel: "Tetap di sini",
        tone: "danger",
      }).then((confirmed) => {
        if (!confirmed) return;
        anchor.dataset["draftGuardAllowed"] = "true";
        anchor.click();
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
