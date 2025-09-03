const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { readFileSync } = require('fs');

let mainWindow;
let astroServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'public/favicon.svg')
  });

  // Start Astro server
  startAstroServer();

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (astroServer) {
      astroServer.kill();
    }
  });
}

function startAstroServer() {
  console.log('Starting Astro server...');
  
  // Get package.json to find the dev script
  const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  astroServer = spawn('npm', ['run', 'preview'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  astroServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Astro:', output);
    
    // Look for the server URL
    if (output.includes('Local:')) {
      const match = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
      if (match) {
        const port = match[1];
        console.log(`Astro server running on port ${port}`);
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    }
  });

  astroServer.stderr.on('data', (data) => {
    console.error('Astro error:', data.toString());
  });

  astroServer.on('close', (code) => {
    console.log(`Astro server exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (astroServer) {
    astroServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (astroServer) {
    astroServer.kill();
  }
});