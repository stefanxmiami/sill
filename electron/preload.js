const { contextBridge, ipcRenderer } = require('electron');

// Mirrors every ipcMain handler in main.js. Renderer sees this as window.api.
contextBridge.exposeInMainWorld('api', {
  pickVault:  () => ipcRenderer.invoke('vault:pick'),
  listTasks:  () => ipcRenderer.invoke('tasks:list'),
  toggleTask: (task) => ipcRenderer.invoke('tasks:toggle', task),
  getDaily:   () => ipcRenderer.invoke('daily:get'),
  saveDaily:  (content) => ipcRenderer.invoke('daily:save', content),
  capture:    (text) => ipcRenderer.invoke('capture:append', text),
  recent:     () => ipcRenderer.invoke('recent:list'),
  openNote:   (file) => ipcRenderer.invoke('note:open', file),
  getConfig:  (key) => ipcRenderer.invoke('config:get', key),
  setConfig:  (key, value) => ipcRenderer.invoke('config:set', key, value),
  hide:       () => ipcRenderer.send('win:hide'),

  // Per-window "always on top" (pin). getPin returns this window's current state.
  getPin:     () => ipcRenderer.invoke('win:pin-get'),
  togglePin:  () => ipcRenderer.invoke('win:pin-toggle'),

  // Preferences window
  readSettings:  () => ipcRenderer.invoke('settings:read'),
  setPin:        (id, flag) => ipcRenderer.invoke('settings:set-pin', id, flag),
  setEnabled:    (ids) => ipcRenderer.invoke('settings:set-enabled', ids),
  setAcrylic:    (flag) => ipcRenderer.invoke('settings:set-acrylic', flag),
  setLogin:      (flag) => ipcRenderer.invoke('settings:set-login', flag),
  showAll:       () => ipcRenderer.invoke('settings:show-all'),
  relaunch:      () => ipcRenderer.invoke('app:relaunch'),

  // Subscribe to vault change broadcasts. Returns an unsubscribe function.
  onVaultChange: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('vault:changed', listener);
    return () => ipcRenderer.removeListener('vault:changed', listener);
  },

  // Fires when this window's pin state changes from elsewhere (e.g. the tray).
  onPinChange: (cb) => {
    const listener = (_e, v) => cb(v);
    ipcRenderer.on('pin:changed', listener);
    return () => ipcRenderer.removeListener('pin:changed', listener);
  },
});
