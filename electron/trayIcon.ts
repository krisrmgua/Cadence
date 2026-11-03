import fs from "node:fs";
import { deflateSync } from "node:zlib";
import { nativeImage } from "electron";
import { assetPath } from "./paths";
import type { Job } from "./types";

export type TrayHealth = "ok" | "fail";

/** Red when any enabled job last failed or was killed; otherwise green. */
export function trayHealthFromJobs(jobs: Job[]): TrayHealth {
  for (const job of jobs) {
    if (!job.enabled) continue;
    if (job.lastStatus === "fail") {
      return "fail";
    }
  }
  return "ok";
}

export function createTrayIcon(health: TrayHealth): Electron.NativeImage {
  const file =
    health === "fail" ? assetPath("tray-fail.png") : assetPath("tray-ok.png");
  if (fs.existsSync(file)) {
    // Colored icons — do not mark as template (macOS would strip the color).
    return nativeImage.createFromPath(file).resize({ width: 18, height: 18 });
  }
  const hex = health === "fail" ? "#ff6b7a" : "#3dd68c";
  return nativeImage.createFromDataURL(solidCircleDataUrl(hex)).resize({
    width: 18,
    height: 18,
  });
}

function solidCircleDataUrl(hex: string): string {
  const h = hex.replace("#", "");
  const rgb: [number, number, number] = [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
  return `data:image/png;base64,${encodeSolidPng(16, 16, rgb).toString("base64")}`;
}

function encodeSolidPng(
  width: number,
  height: number,
  rgb: [number, number, number],
): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const r = Math.min(width, height) / 2 - 0.5;
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const i = y * (width * 4 + 1) + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        raw[i] = rgb[0];
        raw[i + 1] = rgb[1];
        raw[i + 2] = rgb[2];
        raw[i + 3] = 255;
      }
    }
  }
  const compressed = deflateSync(raw);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const typeBuf = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
