import { scanCard, type Raster } from "./scan";
import type { CardKind } from "../../cards/layouts/layout-v1";
import type { CustomFormBinding } from "../../contracts/custom-form";

self.onmessage = (
  event: MessageEvent<{
    id: number;
    image: Raster;
    kind: CardKind;
    roster: number[];
    form?: CustomFormBinding;
  }>,
) => {
  try {
    self.postMessage({
      id: event.data.id,
      result: scanCard(
        event.data.image,
        event.data.kind,
        event.data.roster,
        event.data.form,
      ),
    });
  } catch {
    self.postMessage({ id: event.data.id, error: "SCAN_FAILED" });
  }
  // Incoming transferred frame is not retained, cached, persisted or returned.
};
