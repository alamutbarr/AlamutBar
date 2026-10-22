const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const children = [];

function run(cwd) {
  const child = spawn('npm', ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) return;
    for (const other of children) {
      if (other !== child && !other.killed) other.kill();
    }
    process.exit(code || 0);
  });
  children.push(child);
}

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

run(path.join(root, 'backend'));
run(path.join(root, 'frontend'));
