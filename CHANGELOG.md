# Changelog

All notable changes to this project are documented in this file.

## [1.0.1] - 2026-03-01

### Added (1.0.0)

- Maintainer documentation in `docs/MAINTAINER_GUIDE.md`.
- Automated GitHub release workflow in `.github/workflows/release.yml`.
- Unit tests for form workflow and runtime PDF data-dir resolution.

### Changed

- Installer/release naming moved to `1.0.1` artifacts.
- README expanded with release, screenshot, and maintainer guidance.
- Packaged startup now runs production server in-process with robust URL/port handling.

### Fixed (1.0.0)

- Installed app splash-startup failures and timeout regressions.
- React RSC dev/prod mismatch that caused non-interactive UI (buttons appeared but did not act).
- Packaged runtime data path resolution so APIs work in installed mode.
- Writable PDF save path by copying bundled PDFs to `%APPDATA%/Formmaker/data`.
- Endpoint data-dir lookups by centralizing path resolution via `getPdfDataDir()`.

## [1.0.0] - 2026-03-01

### Added

- Initial Windows desktop packaging (Electron + Vinext).
- NSIS installer and portable build scripts.
- Print-safe PDF download pipeline and merged download support.
- Sidebar download progress/status UI.

### Fixed

- Adobe compatibility issues for generated merged/single downloads.
- Charity Tracker city/state/address mapping behavior.
