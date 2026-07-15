const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const vault = require('./vault');
const config = require('./config');

const DEV = !app.isPackaged;
const WIDGETS = {
  tasks:   { w: 340, h: 440 },
  daily:   { w: 380, h: 480 },
  capture: { w: 340, h: 170 },
  recent:  { w: 300, h: 320 },
};
const windows = new Map();
let tray = null;
let settingsWin = null;

const ICON = path.join(__dirname, '../build/icon.ico');
const isMac = process.platform === 'darwin';

// Shared AppUserModelID → the widget windows collapse into one Sill taskbar
// button (and match the installed shortcut's identity for correct icon/grouping).
app.setAppUserModelId('io.friday430.sill');

// Single instance: relaunching Sill (e.g. from the taskbar/Start Menu shortcut)
// surfaces the existing widgets instead of opening a second copy.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => handleArgs(argv));
}

// Dispatch command-line flags used by the taskbar jump list. A relaunch with a
// flag is forwarded here by the single-instance lock (via 'second-instance').
function handleArgs(argv) {
  if (argv && argv.includes('--preferences')) openSettings();
  else showAll();
}

function createWidget(id) {
  if (windows.has(id)) return windows.get(id).show();
  const def = WIDGETS[id];
  const saved = config.get(`bounds.${id}`) || {};
  const acrylic = config.get('acrylic') === true; // Win11 only, see notes
  const pinned = config.get(`pin.${id}`) === true; // per-widget, default: not on top

  const win = new BrowserWindow({
    width: saved.width ?? def.w,
    height: saved.height ?? def.h,
    x: saved.x, y: saved.y,
    minWidth: 240, minHeight: 120,
    icon: ICON,
    frame: false,
    skipTaskbar: false, // show in the taskbar; shared AppUserModelID groups them into one button
    resizable: true,
    hasShadow: false,
    alwaysOnTop: pinned,
    // "blur" = Win11 acrylic / macOS vibrancy; neither can combine with transparent
    ...(acrylic
      ? (isMac
          ? { vibrancy: 'under-window', visualEffectState: 'active', backgroundColor: '#00000000' }
          : { backgroundMaterial: 'acrylic', backgroundColor: '#00000000' })
      : { transparent: true, backgroundColor: '#00000000' }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 'normal' level keeps a pinned widget above windows but below fullscreen apps
  win.setAlwaysOnTop(pinned, 'normal');

  if (DEV) win.loadURL(`http://localhost:5173/?widget=${id}`);
  else win.loadFile(path.join(__dirname, '../dist/index.html'), { query: { widget: id } });

  let t;
  const persist = () => {
    clearTimeout(t);
    t = setTimeout(() => config.set(`bounds.${id}`, win.getBounds()), 400);
  };
  win.on('move', persist);
  win.on('resize', persist);
  win.on('closed', () => { windows.delete(id); refreshTray(); });
  win.on('show', refreshTray);
  win.on('hide', refreshTray);
  windows.set(id, win);
}

const broadcast = (ch, p) => windows.forEach(w => w.webContents.send(ch, p));

const anyVisible = () => [...windows.values()].some(w => w.isVisible());
const idOf = (win) => { for (const [id, w] of windows) if (w === win) return id; return null; };

function showAll() {
  Object.keys(WIDGETS).forEach(id => (windows.has(id) ? windows.get(id).showInactive() : createWidget(id)));
  refreshTray();
}
function hideAll() {
  windows.forEach(w => w.hide());
  refreshTray();
}
function toggleAll() {
  anyVisible() ? hideAll() : showAll();
}

async function pickVault() {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (r.canceled) return null;
  config.set('vaultPath', r.filePaths[0]);
  vault.open(r.filePaths[0], () => broadcast('vault:changed'));
  broadcast('vault:changed');
  return r.filePaths[0];
}

// Pin/unpin a single widget and persist it. Keeps the window (if open) and its
// header button in sync, whether the toggle came from the tray or the header.
function setPin(id, flag) {
  config.set(`pin.${id}`, flag);
  const win = windows.get(id);
  if (win) {
    win.setAlwaysOnTop(flag, 'normal');
    win.webContents.send('pin:changed', flag);
  }
  refreshTray();
}

function setOpenAtLogin(flag) {
  config.set('openAtLogin', flag);
  app.setLoginItemSettings({ openAtLogin: flag });
  refreshTray();
}

const label = (id) => id[0].toUpperCase() + id.slice(1);

function refreshTray() {
  if (!tray) return;
  const ids = Object.keys(WIDGETS);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: anyVisible() ? 'Hide all widgets' : 'Show all widgets', click: toggleAll },
    {
      label: 'Show widget',
      submenu: ids.map(id => ({
        label: label(id),
        click: () => { createWidget(id); windows.get(id).showInactive(); },
      })),
    },
    { type: 'separator' },
    {
      label: 'Pin on top',
      submenu: ids.map(id => ({
        label: label(id),
        type: 'checkbox',
        checked: config.get(`pin.${id}`) === true,
        click: (mi) => setPin(id, mi.checked),
      })),
    },
    { label: 'Launch at startup', type: 'checkbox', checked: config.get('openAtLogin') === true, click: (mi) => setOpenAtLogin(mi.checked) },
    { type: 'separator' },
    { label: 'Preferences…', click: () => openSettings() },
    { label: 'Choose vault…', click: () => pickVault() },
    { type: 'separator' },
    { label: 'Quit Sill', click: () => app.quit() },
  ]));
}

function openSettings() {
  if (settingsWin) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 440,
    height: 580,
    minWidth: 380,
    minHeight: 440,
    icon: ICON,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    skipTaskbar: false, // show in taskbar/alt-tab while preferences are open
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV) settingsWin.loadURL('http://localhost:5173/?widget=settings');
  else settingsWin.loadFile(path.join(__dirname, '../dist/index.html'), { query: { widget: 'settings' } });

  settingsWin.once('ready-to-show', () => {
    settingsWin.show();
    settingsWin.focus();
  });
  settingsWin.on('closed', () => { settingsWin = null; });
}

function createTray() {
  // macOS menu bar wants a monochrome template image; Windows uses the color mark
  const file = isMac ? 'assets/trayTemplate.png' : 'assets/tray.png';
  const img = nativeImage
    .createFromPath(path.join(__dirname, file))
    .resize({ width: 16, height: 16 });
  if (isMac) img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip('Sill');
  tray.on('click', toggleAll); // left-click toggles all widgets
  refreshTray();
}

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return; // secondary instance: bail before creating windows

  const p = config.get('vaultPath');
  if (p) vault.open(p, () => broadcast('vault:changed'));

  (config.get('enabled') || Object.keys(WIDGETS)).forEach(createWidget);
  createTray();
  // keep the OS login item in sync with the saved preference
  app.setLoginItemSettings({ openAtLogin: config.get('openAtLogin') === true });

  // right-click jump list on the taskbar / Start Menu icon
  app.setUserTasks([
    { program: process.execPath, arguments: '--show-all', iconPath: process.execPath, iconIndex: 0, title: 'Show all widgets', description: 'Show every Sill widget' },
    { program: process.execPath, arguments: '--preferences', iconPath: process.execPath, iconIndex: 0, title: 'Preferences', description: 'Open Sill preferences' },
  ]);
  // on first launch the enabled widgets are already created above; only act on a flag
  if (process.argv.includes('--preferences')) openSettings();

  globalShortcut.register('Control+Alt+O', toggleAll);
  globalShortcut.register('Control+Alt+C', () => {
    createWidget('capture');
    windows.get('capture').focus();
  });
});

app.on('window-all-closed', () => {}); // stay alive in the tray / menu bar
app.on('activate', () => showAll()); // macOS: clicking the Dock icon resurfaces widgets

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
});

ipcMain.handle('vault:pick', () => pickVault());

ipcMain.handle('tasks:list',    () => vault.listTasks());
ipcMain.handle('tasks:toggle',  (_e, t) => vault.toggleTask(t));
ipcMain.handle('daily:get',     () => vault.getDaily());
ipcMain.handle('daily:save',    (_e, c) => vault.saveDaily(c));
ipcMain.handle('capture:append',(_e, t) => vault.capture(t));
ipcMain.handle('recent:list',   () => vault.recent(10));
ipcMain.handle('note:open',     (_e, f) => shell.openExternal(vault.obsidianUrl(f)));
ipcMain.handle('config:get',    (_e, k) => config.get(k));
ipcMain.handle('config:set',    (_e, k, v) => config.set(k, v));
ipcMain.on('win:hide', e => BrowserWindow.fromWebContents(e.sender).hide());

ipcMain.handle('win:pin-get', e => {
  const win = BrowserWindow.fromWebContents(e.sender);
  return win ? win.isAlwaysOnTop() : false;
});
ipcMain.handle('win:pin-toggle', e => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return false;
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next, 'normal');
  const id = idOf(win);
  if (id) config.set(`pin.${id}`, next);
  refreshTray();
  return next;
});

// --- Preferences window ---------------------------------------------------
ipcMain.handle('settings:read', () => {
  const ids = Object.keys(WIDGETS);
  return {
    vaultPath: config.get('vaultPath') || null,
    widgets: ids,
    enabled: config.get('enabled') || ids,
    pins: Object.fromEntries(ids.map(id => [id, config.get(`pin.${id}`) === true])),
    acrylic: config.get('acrylic') === true,
    openAtLogin: config.get('openAtLogin') === true,
  };
});

ipcMain.handle('settings:set-pin', (_e, id, flag) => { setPin(id, flag); });

ipcMain.handle('settings:set-enabled', (_e, ids) => {
  config.set('enabled', ids);
  Object.keys(WIDGETS).forEach(id => {
    const want = ids.includes(id);
    if (want && !windows.has(id)) createWidget(id);
    else if (!want && windows.has(id)) windows.get(id).close();
  });
  refreshTray();
});

ipcMain.handle('settings:set-acrylic', (_e, flag) => { config.set('acrylic', flag); });
ipcMain.handle('settings:set-login', (_e, flag) => { setOpenAtLogin(flag); });
ipcMain.handle('settings:show-all', () => { showAll(); });
ipcMain.handle('settings:open', () => { openSettings(); });
ipcMain.handle('app:relaunch', () => { app.relaunch(); app.exit(0); });
