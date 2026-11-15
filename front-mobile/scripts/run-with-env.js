const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const command = args.shift();
const allowedCommands = new Set(['android', 'ios', 'start']);

if (!allowedCommands.has(command)) {
  console.error('Uso: npm run <android|ios|start> -- --env <local|development>');
  process.exit(2);
}

let profile = 'local';
const envFlagIndex = args.findIndex(
  (arg) => arg === '--env' || arg.startsWith('--env='),
);

if (envFlagIndex !== -1) {
  const envFlag = args[envFlagIndex];
  if (envFlag === '--env') {
    profile = args[envFlagIndex + 1];
    args.splice(envFlagIndex, 2);
  } else {
    profile = envFlag.slice('--env='.length);
    args.splice(envFlagIndex, 1);
  }
}

if (!['local', 'development'].includes(profile)) {
  console.error(`Entorno desconocido: ${profile}. Usá local o development.`);
  process.exit(2);
}

const envFile = `.env.${profile}`;
const envFilePath = path.join(projectDir, envFile);
if (!fs.existsSync(envFilePath)) {
  console.error(`No existe ${envFile}. Crealo desde ${envFile}.example.`);
  process.exit(2);
}

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const reactNativeCommand = {
  android: 'run-android',
  ios: 'run-ios',
  start: 'start',
}[command];

const child = spawn(executable, ['react-native', reactNativeCommand, ...args], {
  cwd: projectDir,
  env: { ...process.env, ENVFILE: envFile },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`No se pudo iniciar React Native CLI: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
