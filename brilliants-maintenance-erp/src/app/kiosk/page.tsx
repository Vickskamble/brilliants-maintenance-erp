"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseQrPayload } from "@/lib/qrcode";
import { searchEquipment } from "@/services/kiosk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Camera, Loader2, AlertTriangle } from "lucide-react";

export default function KioskScanPage() {
  const router = useRouter();
  const readerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: string; equipment_code: string; equipment_name: string; plants: { name: string } | null }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    let disposed = false;
    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || disposed) return;
        const scanner = new Html5Qrcode("kiosk-reader");
        scannerRef.current = {
          stop: () => scanner.stop(),
          clear: () => scanner.clear(),
        };
        setIsReady(true);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const parsed = parseQrPayload(text);
            if (parsed) {
              void scanner.stop();
              router.push(`/kiosk/equipment/${parsed.id}`);
            } else {
              setScanError("Scanned code is not an equipment QR. Try again.");
            }
          },
          () => {}
        );
      } catch {
        if (!cancelled && !disposed) {
          setScanError("Camera unavailable. Use the code box below instead.");
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      disposed = true;
      void scannerRef.current?.stop();
      scannerRef.current?.clear();
      scannerRef.current = null;
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
    const found = await searchEquipment(text);
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

        {isReady ? (
          <div id="kiosk-reader" ref={readerRef} className="mt-3 overflow-hidden rounded-xl" />
        ) : (
          <div className="mt-3 flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
            {scanError ? (
              <span className="flex items-center gap-2 px-4 text-center">
                <AlertTriangle className="h-4 w-4" /> {scanError}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Starting camera...
              </span>
            )}
          </div>
        )}

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