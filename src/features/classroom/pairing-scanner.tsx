"use client";
import { useEffect, useRef, useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "../../ui/components/button";
import { openCamera, type ImageAcquisition } from "../scanner/acquisition";
import { capturePairingLink, parsePairingCode } from "./pairing-url";

export function PairingQrCode({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stopped = false;
    void import("qrcode")
      .then(async (qr) => {
        if (!stopped && canvas.current)
          await qr.toCanvas(canvas.current, url, {
            width: 256,
            margin: 4,
            errorCorrectionLevel: "M",
          });
      })
      .catch(() => {
        if (!stopped) setFailed(true);
      });
    return () => {
      stopped = true;
    };
  }, [url]);
  return failed ? (
    <p>Gunakan kode enam digit di bawah.</p>
  ) : (
    <canvas
      ref={canvas}
      role="img"
      aria-label="QR untuk menyambungkan HP guru"
      data-testid="pairing-qr"
      className="mx-auto max-w-full"
    />
  );
}

export function PairingQrScanner({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const onRead = useRef(onCode);
  const [message, setMessage] = useState(
    "Arahkan kamera ke QR di layar kelas.",
  );
  useEffect(() => {
    onRead.current = onCode;
  }, [onCode]);
  useEffect(() => {
    let stopped = false,
      camera: ImageAcquisition | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      camera?.close();
    };
    async function start() {
      try {
        const { default: decode } = await import("jsqr");
        if (stopped || !video.current) return;
        const acquired = await openCamera(video.current);
        if (stopped) {
          acquired.close();
          return;
        }
        camera = acquired;
        async function frame() {
          if (stopped || !camera) return;
          try {
            const raster = await camera.capture();
            if (stopped) return;
            const decoded = decode(raster.data, raster.width, raster.height, {
              inversionAttempts: "dontInvert",
            });
            if (decoded) {
              const code = parsePairingCode(
                decoded.data,
                window.location.origin,
              );
              if (code) {
                stop();
                onRead.current(code);
                return;
              }
              setMessage(
                "QR ini bukan kode layar aplikasi ini. Gunakan QR di layar kelas atau masukkan kode.",
              );
            }
          } catch {
            /* A video frame may not be ready yet. No image leaves RAM. */
          }
          if (!stopped) timer = setTimeout(() => void frame(), 300);
        }
        void frame();
      } catch {
        if (!stopped)
          setMessage(
            "Kamera belum dapat dibuka. Izinkan kamera di browser atau masukkan kode enam digit.",
          );
      }
    }
    void start();
    return stop;
  }, []);
  return (
    <div className="space-y-3" aria-label="Pindai QR layar">
      <video
        ref={video}
        muted
        playsInline
        className="max-h-64 w-full rounded-input bg-black"
        aria-label="Kamera QR"
      />
      <p role="status">{message}</p>
      <Button type="button" variant="outline" onClick={onClose}>
        Tutup kamera · masukkan kode
      </Button>
    </div>
  );
}

export function PairingCodeInput({
  onPair,
  disabled = false,
}: {
  onPair: (code: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  async function submit(value = code) {
    if (locked.current || disabled || !/^\d{6}$/.test(value)) return;
    locked.current = true;
    setSending(true);
    try {
      setNotice("");
      await onPair(value);
    } catch {
      setNotice(
        "Belum tersambung. Periksa internet dan kode di papan, lalu coba lagi.",
      );
    } finally {
      locked.current = false;
      setSending(false);
    }
  }
  const submitLink = useRef(submit);
  useEffect(() => {
    submitLink.current = submit;
  });
  useEffect(() => {
    // A QR opened in the phone camera is claimed only after an active teacher
    // session has mounted this control, never in the login or selection screen.
    const timer = setTimeout(() => {
      const captured = capturePairingLink();
      if (captured) {
        setCode(captured);
        void submitLink.current(captured);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="space-y-3" aria-busy={sending}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || sending}
        onClick={() => setScanning(!scanning)}
      >
        <QrCode size={20} aria-hidden />
        Pindai QR
      </Button>
      {scanning && (
        <PairingQrScanner
          onCode={(value) => {
            setCode(value);
            setScanning(false);
            void submit(value);
          }}
          onClose={() => setScanning(false)}
        />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="min-w-[min(100%,10rem)] flex-1">
          Kode dari papan
          <input
            name="code"
            aria-label="Kode pasangan"
            required
            pattern="[0-9]{6}"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="mt-1 min-h-12 w-full rounded-input border px-3"
          />
        </label>
        <Button
          type="submit"
          className="h-12 self-end px-4 py-2"
          disabled={disabled || sending}
        >
          {sending ? "Menyambungkan…" : "Hubungkan papan"}
        </Button>
      </form>
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
