import { app, nativeImage } from "electron";
import { createCanvas, Image } from "@napi-rs/canvas";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import type { Job } from "./types";

export type TrayHealth = "ok" | "fail";

/** Match Tickr / Pipeline Tracer menu-bar capsule fill. */
const DARK_FILL = "rgba(14, 23, 36, 0.92)";
const ICON_PT = 18;
const DARK_PT = 22;

/** Only enabled jobs contribute to the menu-bar failure indicator. */
export function trayHealthFromJobs(jobs: Job[]): TrayHealth {
  return jobs.some(job => job.enabled && job.lastStatus === "fail") ? "fail" : "ok";
}

function assetRoot(): string {
  // electron-builder moves extraResources outside app.asar.
  return app.isPackaged ? join(process.resourcesPath, "assets") : join(__dirname, "../assets");
}

function roundRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadArtwork(health: TrayHealth): Buffer {
  const name = health === "fail" ? "failure" : "healthy";
  const buf = readFileSync(join(assetRoot(), "tray", `timeflow-${name}.png`));
  if (!buf.length) throw new Error(`Missing Timeflow tray artwork: ${name}`);
  return buf;
}

/** Generated Timeflow artwork, rasterized at 1x and 2x for an 18pt menu-bar slot. */
export function createTrayIcon(
  health: TrayHealth,
  darkBackground = false,
): Electron.NativeImage {
  const artworkBuf = loadArtwork(health);
  const artwork = nativeImage.createFromBuffer(artworkBuf);
  if (artwork.isEmpty()) throw new Error("Empty Timeflow tray artwork");

  const point = darkBackground ? DARK_PT : ICON_PT;
  const icon = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const size = point * scaleFactor;
    if (!darkBackground) {
      icon.addRepresentation({
        scaleFactor,
        buffer: artwork.resize({ width: size, height: size, quality: "best" }).toPNG(),
      });
      continue;
    }

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    roundRect(ctx, 0, 0, size, size, size * 0.28);
    ctx.fillStyle = DARK_FILL;
    ctx.fill();

    const pad = Math.round(2.5 * scaleFactor);
    const artSize = size - pad * 2;
    const img = new Image();
    img.src = artwork.resize({ width: artSize, height: artSize, quality: "best" }).toPNG();
    ctx.drawImage(img, pad, pad, artSize, artSize);

    icon.addRepresentation({
      scaleFactor,
      width: point,
      height: point,
      buffer: canvas.toBuffer("image/png"),
    });
  }
  icon.setTemplateImage(false);
  return icon;
}
