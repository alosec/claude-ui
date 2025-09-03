#!/usr/bin/env node

import { spawn } from 'child_process';
import { createServer } from 'net';

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to kill process using a port
async function killPortProcess(port) {
  return new Promise((resolve) => {
    const kill = spawn('lsof', ['-ti', `:${port}`]);
    let pid = '';
    
    kill.stdout.on('data', (data) => {
      pid += data.toString();
    });
    
    kill.on('close', (code) => {
      if (pid.trim()) {
        const killProcess = spawn('kill', ['-9', pid.trim()]);
        killProcess.on('close', () => resolve());
      } else {
        resolve();
      }
    });
    
    kill.on('error', () => resolve());
  });
}

async function startDevServer() {
  console.log('Checking port 4321...');
  
  const available = await isPortAvailable(4321);
  if (!available) {
    console.log('Port 4321 is in use, killing existing process...');
    await killPortProcess(4321);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
  }
  
  console.log('Starting Astro dev server on port 4321...');
  
  const astroProcess = spawn('npm', ['run', 'dev', '--', '--port', '4321'], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  astroProcess.on('close', (code) => {
    console.log(`Astro process exited with code ${code}`);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    astroProcess.kill('SIGINT');
    process.exit(0);
  });
}

startDevServer().catch(console.error);