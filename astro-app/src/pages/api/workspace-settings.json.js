import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_WORKSPACE_SETTINGS, SETTINGS, SettingsUtils } from '../../config/settings.ts';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || SETTINGS.DEFAULT_WORKSPACE_PATH;
const SETTINGS_FILE_PATH = path.join(WORKSPACE_PATH, SETTINGS.SETTINGS_FILE);

async function loadSettings() {
  try {
    const settingsData = await fs.readFile(SETTINGS_FILE_PATH, 'utf8');
    const userSettings = JSON.parse(settingsData);
    return SettingsUtils.mergeSettings(DEFAULT_WORKSPACE_SETTINGS, userSettings);
  } catch (error) {
    // If settings file doesn't exist or is invalid, return defaults
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}

async function saveSettings(settings) {
  try {
    // Ensure workspace directory exists
    await fs.mkdir(WORKSPACE_PATH, { recursive: true });
    
    // Write settings file
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save workspace settings:', error);
    return false;
  }
}

// GET request - get workspace settings
export async function GET({ url }) {
  try {
    const settings = await loadSettings();
    
    return new Response(JSON.stringify({
      settings,
      metadata: {
        workspace: WORKSPACE_PATH,
        settingsFile: SETTINGS_FILE_PATH,
        generated: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to load workspace settings',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST request - update workspace settings
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { settings: newSettings } = body;
    
    if (!newSettings || typeof newSettings !== 'object') {
      return new Response(JSON.stringify({ 
        error: 'Settings object is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Load current settings
    const currentSettings = await loadSettings();
    
    // Merge with new settings
    const updatedSettings = SettingsUtils.mergeSettings(currentSettings, newSettings);
    
    // Validate settings
    if (!updatedSettings.defaultPath || typeof updatedSettings.defaultPath !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid defaultPath in settings' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!Array.isArray(updatedSettings.recentProjects)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid recentProjects in settings' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!Array.isArray(updatedSettings.ignorePatterns)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid ignorePatterns in settings' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Save updated settings
    const saveResult = await saveSettings(updatedSettings);
    
    if (!saveResult) {
      return new Response(JSON.stringify({ 
        error: 'Failed to save settings to file' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      settings: updatedSettings,
      updated: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to update workspace settings',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}