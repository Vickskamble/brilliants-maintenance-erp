import QRCode from "qrcode";

export const QR_PREFIX = "BEM:";

export function buildQrPayload(entityId: string): string {
  return `${QR_PREFIX}${entityId}`;
}

export function parseQrPayload(
  text: string
): { prefix: string; id: string } | null {
  const t = (text || "").trim();
  if (!t.startsWith(QR_PREFIX)) return null;
  const id = t.slice(QR_PREFIX.length).trim();
  if (!id) return null;
  return { prefix: QR_PREFIX, id };
}

export async function qrCodeSvg(
  payload: string,
  size = 200
): Promise<string> {
  try {
    return await QRCode.toString(payload, {
      type: "svg",
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

export async function qrCodeDataUrl(
  payload: string,
  size = 256
): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}