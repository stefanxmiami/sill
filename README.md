# Sill

**Obsidian notes, on your desktop.** Frameless, translucent Obsidian vault
widgets for Windows and macOS that rest on your wallpaper. One Electron process
drives four transparent windows (Tasks, Daily Note, Quick Capture, Recent Notes),
each loading the same Vite/React bundle with a different `?widget=` query param
and reading/writing the vault directly via `fs`.

The mark is two overlapping glass panes with a gold urgency spine; palette is
obsidian `#0B0C0E`, panel `#0E0F12`, ice `#E6E8EB`, muted `#8A909C`, gold
`#E8B04B`.

## Run

```bash
npm install
npm run dev      # vite + electron together
```

On first launch no vault is set — each widget shows a **Choose vault folder**
button. Pick your vault once; the path persists to
`%APPDATA%/Sill/config.json` along with each window's bounds.

## Build a Windows installer

```bash
npm run build    # vite build -> electron-builder --win nsis
```

Outputs to `release/`:
- `Sill Setup 0.1.0.exe` — the NSIS installer (adds a Start Menu entry; installs
  per-user, no admin needed).
- `win-unpacked/Sill.exe` — the raw app, runs without installing.

### If the build fails with "Cannot create symbolic link"

electron-builder's `winCodeSign` cache contains macOS `.dylib` symlinks that
Windows refuses to extract without Developer Mode or an elevated shell. Since an
unsigned Windows build doesn't need them, pre-extract the cache once, skipping
the `darwin` folder, then rebuild:

```bash
CACHE="$LOCALAPPDATA/electron-builder/Cache/winCodeSign"
7za x "$CACHE"/*.7z -o"$CACHE/winCodeSign-2.6.0" -x'!darwin' -y
```

(Or just enable Windows Developer Mode / run the terminal as Administrator.)

## Build for macOS

Must be run **on a Mac** — electron-builder can't cross-compile a `.app`/`.dmg`
from Windows.

```bash
npm install
npm run build:mac   # vite build -> electron-builder --mac  (dmg + zip in release/)
```

Then open the `.dmg`, drag **Sill** to Applications, and launch. Because it's
unsigned (free), Gatekeeper will say "unidentified developer" on first run —
right-click the app → **Open**, or System Settings → Privacy & Security →
**Open Anyway**. To run without building, `npm run dev` works on the Mac too.

Platform differences, handled automatically:
- The tray lives in the **menu bar** (top-right) with a monochrome template icon;
  on Windows it's the color mark in the notification area.
- The "wallpaper blur" appearance toggle maps to macOS **vibrancy** (vs Win11
  acrylic).
- Clicking the **Dock** icon resurfaces the widgets (`activate`).

## Tray & hotkeys

A tray icon (the Sill glass-pane mark) lives in the notification area. Left-click
toggles all widgets; right-click opens a menu: show/hide all, show an individual
widget, a **Pin on top** submenu (per widget), **Start with Windows**,
**Preferences…**, **Choose vault…**, and **Quit** (closes everything).

- `Ctrl+Alt+O` — toggle all widgets visible/hidden
- `Ctrl+Alt+C` — focus Quick Capture

### Opening Preferences / reopening widgets

Three ways, so you never have to dig for the tray icon:
- **Gear button** in any widget's header → opens Preferences directly.
- **Right-click the Sill taskbar icon** → jump list with **Show all widgets** and
  **Preferences** (works because the single-instance lock forwards the flag to the
  running app).
- **Tray icon** → **Preferences…**, **Show all widgets**, or **Show widget ▸**.
  (On Win11 the tray icon may sit in the ˄ hidden-icons overflow; drag it onto the
  taskbar to keep it visible.)

Preferences lets you change the vault, toggle which widgets show, pin individual
widgets on top, switch appearance (transparent ↔ acrylic wallpaper blur, with a
relaunch button), and enable launch-on-login. Each widget can also be pinned from
its own header (the thumbtack); header and tray/preferences checkboxes stay in
sync. All of it persists to `config.json` and is restored on next launch.

## Things to configure for your vault

- **Daily notes folder / date format** — `electron/vault.js` `todayPath()` assumes
  `Daily/YYYY-MM-DD.md`. Match it to Obsidian → Settings → Daily notes.
- **Task date format** — the parser expects the Tasks plugin format (`📅 2026-07-20`)
  with a Dataview `due::` fallback. Change the regexes at the top of `vault.js`
  if you write due dates differently.
- **Wallpaper blur** — set `"acrylic": true` in `config.json` for real Win11
  wallpaper blur (`backgroundMaterial: 'acrylic'`). Default is `transparent`,
  which alpha-blends but does not blur. They're mutually exclusive; try both.

## Brand assets

- `build/icon.ico` — multi-size app/installer icon (the glass-pane mark on a dark
  tile), used by electron-builder and the window icons.
- `electron/assets/tray.png` — the tray mark (128px, resized to 16×16 at runtime).

Both are generated from the mark geometry in the brand sheet. To regenerate,
re-rasterize the source SVGs with ImageMagick (`magick … -define
icon:auto-resize=…`).
