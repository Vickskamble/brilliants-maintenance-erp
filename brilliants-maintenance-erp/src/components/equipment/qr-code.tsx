"use client";

import { useEffect, useState } from "react";
import { qrCodeSvg } from "@/lib/qrcode";

export function QrCode({
  payload,
  size = 200,
  className,
}: {
  payload: string;
  size?: number;
  className?: string;
}) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let alive = true;
    qrCodeSvg(payload, size).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [payload, size]);

  if (!svg) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}