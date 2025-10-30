const { spawn } = require('child_process');

const processes = new Set();
let shuttingDown = false;

function terminateAll(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill('SIGINT');
    }
  }
  setTimeout(() => process.exit(code), 100);
}

function runProcess(command, args, name) {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  processes.add(child);

  child.on('exit', (code, signal) => {
    processes.delete(child);
    if (!shuttingDown) {
      if (code !== 0) {
        console.error(`${name} exited with code ${code}${signal ? ` (signal ${signal})` : ''}`);
      }
      terminateAll(code ?? 0);
    }
  });

  child.on('error', (error) => {
    console.error(`Failed to start ${name}:`, error);
    terminateAll(1);
  });
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

runProcess('node', ['backend/server.js'], 'Backend');
runProcess(npmCmd, ['run', 'client'], 'Frontend');

process.on('SIGINT', () => terminateAll(0));
process.on('SIGTERM', () => terminateAll(0));
