import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

export function dataDir(): string {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function storePath(): string {
  return path.join(dataDir(), "cadence.json");
}

export function assetPath(...parts: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "assets", ...parts);
  }
  return path.join(app.getAppPath(), "assets", ...parts);
}

export function defaultShell(): string {
  if (process.platform === "win32") {
    return process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || "/bin/zsh";
}

export function homeDir(): string {
  return os.homedir();
}
