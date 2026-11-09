import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 420,
    frame: true,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Universal App Launcher via Start Menu index
const launchAppByName = (rawAppName) => {
  const appName = rawAppName.trim().toLowerCase();
  
  if (appName === 'task manager' || appName === 'taskmgr') {
    exec('start taskmgr');
    return "Opening Task Manager.";
  }
  if (appName === 'file manager' || appName === 'explorer') {
    exec('start explorer');
    return "Opening File Explorer.";
  }

  const safeAppName = appName.replace(/"/g, '`"');
  const psCommand = `powershell -NoProfile -Command "$app = Get-StartApps | Where-Object { $_.Name -like '*${safeAppName}*' } | Select-Object -First 1; if ($app) { Start-Process ('shell:AppsFolder\\' + $app.AppID) } else { Start-Process '${safeAppName}' }"`;

  exec(psCommand, (error) => {
    if (error) console.log("App launch error:", error);
  });

  return `Opening ${rawAppName}.`;
};

// Handle Pure Voice Recordings & Direct Voice Actions
ipcMain.handle('process-audio', async (event, base64AudioData) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Error: API key missing.";

    const base64Data = base64AudioData.split(';base64,').pop();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are JARVIS, an advanced voice desktop companion for Abhinav. Listen to this audio command. If the user wants to open an application (e.g., 'open zoom', 'open chrome', 'open spotify'), output ONLY the phrase like 'open zoom'. Otherwise, answer the question directly, naturally, and very concisely in 1-2 spoken sentences."
                },
                {
                  inline_data: {
                    mime_type: "audio/webm",
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't catch that, Abhinav.";
    const lowerReply = reply.toLowerCase().trim();

    if (lowerReply.startsWith('open ') || lowerReply.startsWith('launch ') || lowerReply.length < 25) {
      const targetApp = lowerReply.replace('open ', '').replace('launch ', '').trim();
      if (!targetApp.includes(' ')) {
        return launchAppByName(targetApp);
      }
    }

    return reply;
  } catch (error) {
    return `System error: ${error.message}`;
  }
});

app.whenReady().then(() => {
  createWindow();

  // Global Hotkey to summon/hide JARVIS anywhere: Ctrl + Shift + J
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});