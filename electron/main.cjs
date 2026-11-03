// HANAMI masaüstü kabuğu (Electron). Arayüz, dist/ klasöründeki aynı web uygulamasıdır.
const { app, BrowserWindow, Menu, protocol, net, shell, nativeTheme } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const DEV_URL = process.env.HANAMI_DEV_URL;

// file:// altında modül worker'lar ve fetch kısıtlanır; bu yüzden uygulamayı özel bir şemadan sunuyoruz.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

function send(win, action) {
  if (win && !win.isDestroyed()) win.webContents.send('hanami:menu', action);
}

function buildMenu(getWin) {
  const act = action => () => send(getWin(), action);
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Dosya',
      submenu: [
        { label: 'Müzik ekle…', accelerator: 'CmdOrCtrl+O', click: act('add-files') },
        { label: 'Klasör ekle…', accelerator: 'CmdOrCtrl+Shift+O', click: act('add-folder') },
        { label: 'Yeni albüm…', accelerator: 'CmdOrCtrl+N', click: act('new-album') },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Pencereyi kapat' } : { role: 'quit', label: 'Çıkış' }
      ]
    },
    {
      label: 'Oynatma',
      submenu: [
        { label: 'Oynat / duraklat', accelerator: 'Space', registerAccelerator: false, click: act('toggle-play') },
        { label: 'Önceki şarkı', accelerator: 'CmdOrCtrl+Left', click: act('prev') },
        { label: 'Sonraki şarkı', accelerator: 'CmdOrCtrl+Right', click: act('next') },
        { type: 'separator' },
        { label: '5 saniye geri', accelerator: 'Left', registerAccelerator: false, click: act('seek-back') },
        { label: '5 saniye ileri', accelerator: 'Right', registerAccelerator: false, click: act('seek-forward') },
        { type: 'separator' },
        { label: 'Tam ekran oynatıcıyı aç / kapat', accelerator: 'CmdOrCtrl+Shift+F', click: act('toggle-player') }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Kenar çubuğunu göster / gizle', accelerator: 'CmdOrCtrl+B', click: act('toggle-sidebar') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam ekran' },
        { role: 'resetZoom', label: 'Gerçek boyut' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Geliştirici araçları' }
      ]
    },
    {
      label: 'Pencere',
      submenu: [{ role: 'minimize', label: 'Küçült' }, { role: 'close', label: 'Kapat' }]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'HANAMI GitHub sayfası',
          click: () => shell.openExternal('https://github.com/Yusuff2560/hanami-player')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#101014' : '#f4f8fc',
    title: 'HANAMI',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => (mainWindow = null));

  // Dış bağlantılar tarayıcıda açılır, uygulama penceresi içinde gezinilmez
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://') && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault();
  });

  mainWindow.loadURL(DEV_URL || 'app://hanami/index.html');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle('app', request => {
      const { pathname } = new URL(request.url);
      const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
      const file = path.normalize(path.join(DIST, rel));
      if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    buildMenu(() => mainWindow);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
