import QRCode from "qrcode";

export interface QrDownloadLabel {
  code?: string | null;
  name?: string | null;
}

function clampText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function downloadQrPng(
  payload: string,
  filename: string,
  size = 512,
  label?: QrDownloadLabel
): Promise<void> {
  try {
    const hasLabel =
      !!label && (Boolean(label.code) || Boolean(label.name));
    const labelHeight = hasLabel ? 110 : 0;
    const total = size + labelHeight;

    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, payload, {
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
    });

    const canvas = document.createElement("canvas");
    canvas.width = total;
    canvas.height = total;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      window.alert("Could not generate QR image.");
      return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qrCanvas, 0, 0, size, size);

    if (hasLabel) {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const cx = total / 2;
      let y = size + 16;
      if (label?.code) {
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 34px system-ui, Arial, sans-serif";
        ctx.fillText(clampText(ctx, label.code, total - 32), cx, y);
        y += 46;
      }
      if (label?.name) {
        ctx.fillStyle = "#475569";
        ctx.font = "400 26px system-ui, Arial, sans-serif";
        ctx.fillText(clampText(ctx, label.name, total - 32), cx, y);
      }
    }

    const url = canvas.toDataURL("image/png");
    if (!url) {
      window.alert("Could not generate QR image.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.alert("Could not generate QR image.");
  }
}