import { afterEach, describe, expect, it, vi } from "vitest";
import { openCamera } from "../../src/features/scanner/acquisition";
afterEach(() => vi.unstubAllGlobals());
describe("QR reuses the local camera permission and cleanup boundary", () => {
  it("reports unsupported/insecure camera without attempting a network request", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    const acquire = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: acquire } });
    await expect(openCamera({} as HTMLVideoElement)).rejects.toThrow(
      "CAMERA_SECURE_CONTEXT",
    );
    expect(acquire).not.toHaveBeenCalled();
  });
  it("propagates permission denial to the scanner's manual code fallback", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(new DOMException("denied", "NotAllowedError")),
      },
    });
    await expect(openCamera({} as HTMLVideoElement)).rejects.toMatchObject({
      name: "NotAllowedError",
    });
  });
  it("releases every camera track when preview closes or playback fails", async () => {
    const stop = vi.fn(),
      stream = { getTracks: () => [{ stop }] };
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const video = {
      srcObject: null,
      play: vi.fn().mockResolvedValue(undefined),
    };
    const camera = await openCamera(video as unknown as HTMLVideoElement);
    camera.close();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    video.play.mockRejectedValue(new Error("blocked"));
    await expect(
      openCamera(video as unknown as HTMLVideoElement),
    ).rejects.toThrow("CAMERA_PLAYBACK");
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
