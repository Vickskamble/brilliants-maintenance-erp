"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseQrPayload } from "@/lib/qrcode";
import { searchEquipment } from "@/services/kiosk";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Camera, Loader2, AlertTriangle } from "lucide-react";

type ScannerMode = "loading" | "barcode" | "html5" | "error";

let html5Scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

export default function KioskScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { organization, plant } = useAuth();

  const [mode, setMode] = useState<ScannerMode>("loading");
  const [scanError, setScanError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: string; equipment_code: string; equipment_name: string; plants: { name: string } | null }>
  >([]);

  useEffect(() => {
    let disposed = false;
    let handled = false;
    let interval: number | undefined;

    async function startBarcodeScanner() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        if (disposed) return;
        setMode("error");
        setScanError("Camera unavailable. Use the code box below instead.");
        return;
      }
      if (disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const BarcodeDetector = (window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }).BarcodeDetector;
      if (!BarcodeDetector) {
        stream.getTracks().forEach((t) => t.stop());
        void startHtml5Scanner();
        return;
      }
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      setMode("barcode");
      // wait for the <video> element to render before wiring the stream
      await new Promise((r) => setTimeout(r, 60));
      if (disposed || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay may be blocked with sound; video stays muted */
      }
      interval = window.setInterval(async () => {
        if (disposed || handled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes) {
            const parsed = parseQrPayload(code.rawValue);
            if (parsed) {
              handled = true;
              router.push(`/kiosk/equipment/${parsed.id}`);
              return;
            }
          }
        } catch {
          /* decoding frame failed, try next frame */
        }
      }, 200);
    }

    async function startHtml5Scanner() {
      const container = document.getElementById("kiosk-reader");
      if (container) container.innerHTML = "";
      if (html5Scanner) {
        try {
          await html5Scanner.stop();
        } catch {
          /* ignore */
        }
        try {
          html5Scanner.clear();
        } catch {
          /* ignore */
        }
        html5Scanner = null;
      }
      if (disposed) return;
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        if (container) container.innerHTML = "";
        setMode("html5");
        const scanner = new Html5Qrcode("kiosk-reader", false);
        html5Scanner = {
          stop: () => scanner.stop(),
          clear: () => scanner.clear(),
        };
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text: string) => {
            if (disposed || handled) return;
            const parsed = parseQrPayload(text);
            if (parsed) {
              handled = true;
              void scanner.stop().then(() => {
                if (!disposed) router.push(`/kiosk/equipment/${parsed.id}`);
              });
            } else {
              setScanError("Scanned code is not an equipment QR. Try again.");
            }
          },
          () => {}
        );
      } catch {
        if (!disposed) {
          setMode("error");
          setScanError("Camera unavailable. Use the code box below instead.");
        }
      }
    }

    if (typeof window !== "undefined") {
      void startBarcodeScanner();
    }

    return () => {
      disposed = true;
      handled = true;
      if (interval !== undefined) window.clearInterval(interval);
      const video = videoRef.current;
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
      const scanner = html5Scanner;
      html5Scanner = null;
      if (scanner) {
        void scanner.stop().catch(() => {});
        try {
          scanner.clear();
        } catch {
          /* ignore */
        }
      }
      const container = document.getElementById("kiosk-reader");
      if (container) container.innerHTML = "";
    };
  }, [router]);

  async function handleManual(code: string) {
    const text = code.trim();
    if (!text) return;
    const parsed = parseQrPayload(text);
    if (parsed) {
      router.push(`/kiosk/equipment/${parsed.id}`);
      return;
    }
    setIsSearching(true);
    const found = await searchEquipment(text, {
      organizationId: organization?.id ?? null,
      plantId: plant?.id ?? null,
    });
    setIsSearching(false);
    setResults(found);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Camera className="h-4 w-4 text-blue-600" />
          Scan Equipment QR
        </div>

        <div className="mt-3">
          {mode === "barcode" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-64 w-full rounded-xl bg-black object-cover"
            />
          )}
          {mode === "html5" && (
            <div id="kiosk-reader" className="overflow-hidden rounded-xl" />
          )}
          {mode === "loading" && (
            <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Starting camera...
              </span>
            </div>
          )}
          {mode === "error" && (
            <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
              <span className="flex items-center gap-2 px-4 text-center">
                <AlertTriangle className="h-4 w-4" /> {scanError}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label
            htmlFor="kiosk-code"
            className="block text-xs font-medium text-gray-600"
          >
            No camera? Type the QR code text (e.g. BEM:uuid) or search by code/name
          </label>
          <form
            className="mt-1.5 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleManual(manual);
            }}
          >
            <Input
              id="kiosk-code"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="BEM:... or equipment code"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button type="submit" variant="outline" className="shrink-0">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {results.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => router.push(`/kiosk/equipment/${r.id}`)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${
                i > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {r.equipment_code}
                </p>
                <p className="text-xs text-gray-500">{r.equipment_name}</p>
              </div>
              <span className="text-xs text-slate-400">{r.plants?.name ?? ""}</span>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && manual.trim() && !isSearching && (
        <p className="text-center text-sm text-slate-400">No equipment found.</p>
      )}
    </div>
  );
}