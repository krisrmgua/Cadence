import { nativeImage } from "electron";
import { deflateSync } from "node:zlib";
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

/**
 * Colored clock badge for the menu bar / tray.
 * Drawn at 36×36 with scaleFactor 2 so Retina gets a smooth 18pt icon
 * (hard-edged 16–32px assets look jagged after downscale).
 */
export function createTrayIcon(health: TrayHealth): Electron.NativeImage {
  const fill = health === "fail" ? [255, 107, 122] : [61, 214, 140];
  const png = encodeClockBadgePng(36, fill as [number, number, number]);
  return nativeImage.createFromBuffer(png, { scaleFactor: 2 });
}

/** Soft coverage for a filled disc (anti-aliased edge ~1px). */
function discCover(dx: number, dy: number, r: number): number {
  const d = Math.hypot(dx, dy);
  if (d <= r - 0.5) return 1;
  if (d >= r + 0.5) return 0;
  return r + 0.5 - d;
}

/** Soft coverage for a ring (annulus) between rInner and rOuter. */
function ringCover(dx: number, dy: number, rInner: number, rOuter: number): number {
  return Math.max(0, discCover(dx, dy, rOuter) - discCover(dx, dy, rInner));
}

/** Axis-aligned rounded rect coverage (for clock hands). */
function rectCover(
  dx: number,
  dy: number,
  halfW: number,
  halfH: number,
): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax <= halfW - 0.5 && ay <= halfH - 0.5) return 1;
  if (ax >= halfW + 0.5 || ay >= halfH + 0.5) return 0;
  const cx = ax > halfW - 0.5 ? halfW + 0.5 - ax : 1;
  const cy = ay > halfH - 0.5 ? halfH + 0.5 - ay : 1;
  return Math.min(cx, cy);
}

function encodeClockBadgePng(
  size: number,
  rgb: [number, number, number],
): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const badgeR = size / 2 - 1.25;
  const faceR = badgeR * 0.62;
  const faceStroke = Math.max(1.1, size * 0.055);
  const hub = size * 0.04;
  const handW = size * 0.055;
  // Hands: short hour (up), longer minute (right) — ~3 o'clock feel.
  const hourLen = faceR * 0.45;
  const minuteLen = faceR * 0.72;

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;

      const badge = discCover(dx, dy, badgeR);
      const ring = ringCover(dx, dy, faceR - faceStroke, faceR);
      // Minute hand along +x from center; hour hand along -y.
      const minute = rectCover(dx - minuteLen / 2, dy, minuteLen / 2, handW / 2);
      const hour = rectCover(dx, dy + hourLen / 2, handW / 2, hourLen / 2);
      const center = discCover(dx, dy, hub);
      const white = Math.min(1, ring + minute + hour + center);

      const aBadge = badge;
      const r = Math.round(rgb[0] * (1 - white) + 255 * white);
      const g = Math.round(rgb[1] * (1 - white) + 255 * white);
      const b = Math.round(rgb[2] * (1 - white) + 255 * white);
      const a = Math.round(255 * aBadge);

      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
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
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
