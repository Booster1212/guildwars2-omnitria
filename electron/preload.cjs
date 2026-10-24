const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  setOpacity: (opacity) => ipcRenderer.send('window-set-opacity', opacity),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-set-always-on-top', flag),
  resetPosition: () => ipcRenderer.send('window-reset-position'),
  setWindowMode: (mode) => ipcRenderer.send('window-set-mode', mode), // 'mini' | 'full'
  setIgnoreMouse: (ignore) => ipcRenderer.send('window-set-ignore-mouse', ignore),
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  sendChatMessage: (text) => ipcRenderer.send('gw2-send-chat', text),
  teleportWaypoint: (waypoint) => ipcRenderer.send('gw2-teleport-waypoint', waypoint),
  onClickThroughToggled: (callback) => {
    const handler = (_event, clickThrough) => callback(clickThrough);
    ipcRenderer.on('click-through-toggled', handler);
    return () => ipcRenderer.removeListener('click-through-toggled', handler);
  },
  onWindowModeChanged: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on('window-mode-changed', handler);
    return () => ipcRenderer.removeListener('window-mode-changed', handler);
  },
  fetchGw2Api: (url) => ipcRenderer.invoke('gw2-api-fetch', url),
  readStore: (name) => ipcRenderer.invoke('store-read', name),
  writeStore: (name, json) => ipcRenderer.send('store-write', name, json),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  checkUpdate: () => ipcRenderer.invoke('app-check-update'),
  applyUpdate: (downloadUrl) => ipcRenderer.invoke('app-apply-update', downloadUrl),
  onUpdateProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
});
