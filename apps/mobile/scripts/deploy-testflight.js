#!/usr/bin/env node
/**
 * Deploy to TestFlight via Fastlane rock_beta lane.
 *
 * Usage:
 *   node scripts/deploy-testflight.js          # beta (default)
 *   node scripts/deploy-testflight.js release   # release
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(ROOT, 'ios');
const REPO_ROOT = path.resolve(ROOT, '../..');

const mode = process.argv[2] || 'beta';
const lane = mode === 'release' ? 'rock_release' : 'rock_beta';
const logDir = mode === 'release' ? 'deploy-release' : 'deploy-beta';

// CocoaPods aborts and fastlane warns when the locale isn't UTF-8:
//   Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
// macOS only populates LANG from Terminal.app's locale preference, so the value
// depends on how the deploy was launched (terminal vs. VS Code task vs. CI) and on
// each machine's shell config. Pin it here so the build behaves identically
// everywhere — both spawns below inherit process.env.
process.env.LANG = process.env.LANG || 'en_US.UTF-8';
process.env.LC_ALL = process.env.LC_ALL || 'en_US.UTF-8';

// ── Node version ─────────────────────────────────────────────────────────────
// The build (Re.Pack bundling, RN codegen) needs the version pinned in the repo's
// .nvmrc, but a machine's global nvm default is often deliberately older for other
// projects. So switch per-command rather than globally: this prelude is prepended
// to the bash commands spawned below, which means the switch lives and dies with
// those child processes. A child cannot mutate its parent's environment, so the
// caller's shell — and every other project on the machine — keeps whatever node it
// already had. There is nothing to restore afterwards.
//
// If nvm isn't present (CI, mise, volta) the prelude is a no-op and we fall back to
// verifying whatever node is on PATH.
function nvmPrelude() {
  const nvmrc = path.join(REPO_ROOT, '.nvmrc');
  if (!fs.existsSync(nvmrc)) return '';

  const want = fs.readFileSync(nvmrc, 'utf8').trim();
  if (!want) return '';

  return [
    'export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"',
    'if [ -s "$NVM_DIR/nvm.sh" ]; then',
    '  . "$NVM_DIR/nvm.sh" >/dev/null 2>&1',
    `  nvm use ${want} >/dev/null 2>&1 || nvm use >/dev/null 2>&1 || true`,
    'fi',
  ].join('\n');
}

function requiredNodeMajor() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const match = /(\d+)/.exec((pkg.engines && pkg.engines.node) || '');
    if (match) return Number(match[1]);
  } catch (_) {
    /* fall through */
  }
  return null;
}

// Fail before the build rather than partway through it, with an instruction that
// actually fixes the problem.
function ensureNodeForBuild() {
  const min = requiredNodeMajor();
  if (min === null) return;

  const probe = spawnSync('bash', ['-lc', `${nvmPrelude()}\nnode -v`], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });

  const version = (probe.stdout || '').trim();
  const major = Number((/v(\d+)/.exec(version) || [])[1]);

  if (!major) {
    throw new Error(
      `Could not determine the node version for the build.\n` +
        `  bash -lc 'node -v' produced: ${JSON.stringify(version)}`
    );
  }

  if (major < min) {
    throw new Error(
      `Build needs node >= ${min}, but the build shell resolves to ${version}.\n\n` +
        `  Your global default is intentionally left alone. To fix:\n` +
        `    nvm install    # installs the version in .nvmrc\n\n` +
        `  This only affects the deploy; your shell default is unchanged.`
    );
  }

  log('🟢', `Build node: ${version} (requires >= ${min})`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

function run(cmd, opts = {}) {
  const result = spawnSync('bash', ['-lc', `${nvmPrelude()}\n${cmd}`], {
    stdio: opts.silent ? 'pipe' : 'inherit',
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (!opts.ignoreError && result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
  return result;
}

// ── Pre-flight checks ───────────────────────────────────────────────────────

function ensureBuildDirs() {
  // Re.Pack needs this directory and placeholder files to exist
  const dirs = [
    path.join(ROOT, 'build', 'generated', 'ios'),
    path.join(ROOT, 'build', 'generated', 'android'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Re.Pack tries to open these files on startup; touch them if missing
  for (const name of ['index.bundle', 'index.bundle.map']) {
    const f = path.join(ROOT, 'build', 'generated', 'ios', name);
    if (!fs.existsSync(f)) fs.writeFileSync(f, '');
  }
}

function sanitizeAppDelegate() {
  // Replace any hardcoded IP:8081 with localhost:8081 for release builds
  const file = path.join(IOS_DIR, 'FajrEMR', 'AppDelegate.swift');
  if (!fs.existsSync(file)) return;

  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(
    /http:\/\/\d+\.\d+\.\d+\.\d+:8081/g,
    'http://localhost:8081'
  );
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    log('🔧', 'Replaced hardcoded IP with localhost in AppDelegate.swift');
  }
}

function ensureIosDeps() {
  log('📦', 'Checking iOS dependencies...');
  run('eval "$(rbenv init -)" && ./scripts/ensure-ios-deps.sh');
}

// ── Build log setup ─────────────────────────────────────────────────────────

function setupBuildLog() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('-');

  const dir = path.join(ROOT, 'build-logs', logDir, dateStr);
  fs.mkdirSync(dir, { recursive: true });

  const logPath = path.join(dir, `${logDir}-${timeStr}.log`);
  return logPath;
}

// ── Log cleanup ─────────────────────────────────────────────────────────────

const MAX_LOGS = 10;

function pruneOldLogs() {
  const baseDir = path.join(ROOT, 'build-logs', logDir);
  if (!fs.existsSync(baseDir)) return;

  // Collect all .log files across all date subdirectories
  const allLogs = [];
  for (const entry of fs.readdirSync(baseDir)) {
    const dateDir = path.join(baseDir, entry);
    if (!fs.statSync(dateDir).isDirectory()) continue;
    for (const file of fs.readdirSync(dateDir)) {
      if (!file.endsWith('.log')) continue;
      const fullPath = path.join(dateDir, file);
      allLogs.push({ path: fullPath, dir: dateDir, mtime: fs.statSync(fullPath).mtimeMs });
    }
  }

  if (allLogs.length <= MAX_LOGS) return;

  // Sort newest first, delete the rest
  allLogs.sort((a, b) => b.mtime - a.mtime);
  const toDelete = allLogs.slice(MAX_LOGS);
  let freed = 0;
  for (const entry of toDelete) {
    freed += fs.statSync(entry.path).size;
    fs.unlinkSync(entry.path);
  }

  // Remove empty date directories
  for (const entry of fs.readdirSync(baseDir)) {
    const dateDir = path.join(baseDir, entry);
    if (fs.statSync(dateDir).isDirectory() && fs.readdirSync(dateDir).length === 0) {
      fs.rmdirSync(dateDir);
    }
  }

  const freedMB = (freed / 1024 / 1024).toFixed(1);
  log('🧹', `Pruned ${toDelete.length} old log${toDelete.length === 1 ? '' : 's'} (freed ${freedMB} MB)`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('🚀', `Deploying iOS app to ${mode === 'release' ? 'App Store' : 'TestFlight'}...`);

  // Cleanup old logs before starting
  pruneOldLogs();

  // Pre-flight
  ensureNodeForBuild();
  ensureBuildDirs();
  sanitizeAppDelegate();
  ensureIosDeps();

  // Build log
  const logPath = setupBuildLog();
  log('📄', `Log: ${path.relative(ROOT, logPath)}`);

  // Run fastlane using async spawn to avoid pipe buffer deadlocks
  // (xcodebuild produces massive output that exceeds spawnSync's 1MB maxBuffer)
  const fastlaneCmd = [
    nvmPrelude(),
    [
      'eval "$(rbenv init -)"',
      `cd "${IOS_DIR}"`,
      `BUNDLE_GEMFILE="$(pwd)/../Gemfile" bundle exec fastlane ${lane}`,
    ].join(' && '),
  ]
    .filter(Boolean)
    .join('\n');

  const logStream = fs.createWriteStream(logPath);
  const exitCode = await new Promise((resolve) => {
    const child = spawn('bash', ['-lc', fastlaneCmd], {
      cwd: ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      logStream.write(data);
    });

    child.on('close', (code) => {
      logStream.end(() => resolve(code));
    });
  });

  if (exitCode === 0) {
    console.log('');
    log('✅', 'Deploy completed successfully!');
    log('📄', `Full log: ${path.relative(ROOT, logPath)}`);
  } else {
    console.log('');
    log('❌', 'Deploy failed!');
    log('📄', `Full log: ${path.relative(ROOT, logPath)}`);
    process.exit(1);
  }
}

main();
