const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const supportedMajors = new Set([18, 20, 22]);
const currentMajor = Number(process.versions.node.split('.')[0]);
const localNode = path.join(__dirname, '..', 'tools', 'node-v22.22.2-win-x64', 'node.exe');
const serverEntry = path.join(__dirname, '..', 'server.js');

if (supportedMajors.has(currentMajor)) {
  require(serverEntry);
  return;
}

if (!fs.existsSync(localNode)) {
  console.error(
    `Node ${process.versions.node} is not supported for this project. ` +
    `Install or use Node 18, 20, or 22.`
  );
  process.exit(1);
}

console.log(
  `Current Node ${process.versions.node} is unsupported for this app. ` +
  `Delegating to local runtime at ${localNode}.`
);

const child = spawn(localNode, [serverEntry], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', code => {
  process.exit(code == null ? 1 : code);
});

child.on('error', err => {
  console.error('Failed to start local Node runtime:', err.message);
  process.exit(1);
});
