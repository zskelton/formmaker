# Formmaker Maintainer Guide

This guide is for future-you (or any maintainer) to quickly understand how Formmaker runs, where data lives, and how to ship stable releases.

## 1) High-level architecture

- **Desktop shell:** Electron main process in `electron/main.cjs`
- **App server/UI:** Vinext (React + server routes)
- **PDF storage:** runtime folder selected by `app/lib/pdf-data-dir.ts`
- **PDF APIs:** `app/api/pdfs/**`
- **Viewer/editor UI:** `app/pdf-browser.tsx`

## 2) Critical runtime behavior (packaged app)

When installed:

1. Electron runs a self-check (`runPackagedSelfCheck`) for required runtime files.
2. Electron copies bundled PDFs into a writable user folder:
   - `%APPDATA%/Formmaker/data`
3. Electron sets `FORMMAKER_DATA_DIR` so all server routes use that writable folder.
4. Electron starts Vinext production server **in-process** and loads the UI URL.

Why this matters:

- Writing into packaged resources (`app.asar`) is not safe.
- Using writable user data prevents save/download button failures.

## 3) Data path rules

`getPdfDataDir()` is the single source of truth for PDF file location.

Priority:

1. `FORMMAKER_DATA_DIR` (set by Electron in packaged mode)
2. Dev fallback paths (like `app/data`)
3. Packaged fallback paths under resources

If routes stop finding files, inspect `app/lib/pdf-data-dir.ts` first.

## 4) Known failure signatures and fixes

### A) Splash screen then app exits

Usually startup server boot issue.

Check:

- `electron/main.cjs` `startProdServer()`
- Port binding behavior
- self-check diagnostics dialog

### B) App opens but buttons do nothing

Usually hydration mismatch or server-mode mismatch.

Known fix already in code:

- Force `process.env.NODE_ENV = "production"` before Vinext server startup.

### C) “Internal Server Error” page

Usually data directory resolution issue.

Check:

- `getPdfDataDir()` candidates
- whether `%APPDATA%/Formmaker/data` exists and contains PDFs

## 5) Release process (Windows NSIS)

### Build locally

- `npm install`
- `npm run build:nsis`

Output in `release/`:

- `Formmaker Setup x.y.z.exe`
- `Formmaker Setup x.y.z.exe.blockmap`
- `latest.yml`

### Version bump

- Update `package.json` `version`
- Run `npm install` to refresh lock metadata
- Rebuild installer

### Publish to GitHub Release

Upload all three release assets above.

## 6) Quick smoke test checklist

After install:

1. Launch from Start Menu (single click, no extra processes)
2. Select a file in left pane
3. Click `Edit Selected` and save a value
4. Click `Download`
5. Click `Download All`
6. Open outputs in Adobe and confirm no page errors

## 7) Files to read first when returning later

- `electron/main.cjs` (startup/runtime glue)
- `app/lib/pdf-data-dir.ts` (data path resolver)
- `app/pdf-browser.tsx` (button handlers + UX)
- `app/api/pdfs/[file]/save/route.ts` (write flow)
- `app/api/pdfs/download-all/route.ts` (merged output)

## 8) Practical troubleshooting order

1. Reproduce in installed app (not only dev mode)
2. Verify `%APPDATA%/Formmaker/data` contents
3. Test one API route directly from app context (fields/save)
4. Rebuild NSIS from clean `release/`, `dist/`, `out/`
5. Re-test with fresh install

---

If you only have 10 minutes: start at `electron/main.cjs` and `app/lib/pdf-data-dir.ts`.
