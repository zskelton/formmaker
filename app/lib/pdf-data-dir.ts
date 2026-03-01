import { existsSync } from "node:fs";
import path from "node:path";

// Build candidate paths in priority order for dev and packaged runtime.
function buildDataDirCandidates() {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "app", "data"),
    path.resolve(cwd, "data")
  ];

  if (process.resourcesPath) {
    candidates.push(
      path.join(process.resourcesPath, "app.asar", "app", "data"),
      path.join(process.resourcesPath, "app", "data"),
      path.join(process.resourcesPath, "data")
    );
  }

  return candidates;
}

// Single source of truth for where PDF files are read/written.
// In packaged mode, Electron sets FORMMAKER_DATA_DIR to a writable user folder.
export function getPdfDataDir() {
  const override = process.env.FORMMAKER_DATA_DIR;

  if (override && existsSync(override)) {
    return override;
  }

  const candidates = buildDataDirCandidates();
  const match = candidates.find((candidate) => existsSync(candidate));

  return match ?? candidates[0];
}
