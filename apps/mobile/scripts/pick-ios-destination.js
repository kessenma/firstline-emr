#!/usr/bin/env node

/**
 * Interactive iOS destination picker for FajrEMR.
 * Use arrow keys (or j/k) to navigate, Enter to select.
 * Lists physical devices first, then simulators.
 */

const {execSync, spawn} = require('child_process');
const path = require('path');
const {getDestinations} = require('./ios-destinations');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgCyan: '\x1b[46m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgBlack: '\x1b[40m',
  inverse: '\x1b[7m',
};

const write = s => process.stdout.write(s);
const hideCursor = () => write('\x1b[?25l');
const showCursor = () => write('\x1b[?25h');
const moveTo = (row, col) => write(`\x1b[${row};${col}H`);
const clearScreen = () => write('\x1b[2J');

// ── Render the picker ─────────────────────────────────────────────────────────
function render(items, cursor) {
  clearScreen();
  moveTo(1, 1);

  write(`${c.bold}${c.cyan}  Pick an iOS destination${c.reset}  ${c.dim}↑↓/jk to move, Enter to select, q to quit${c.reset}\n`);
  write(`${c.dim}${'─'.repeat(60)}${c.reset}\n`);

  let lastType = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Section header
    if (item.type !== lastType) {
      if (lastType !== null) write('\n');
      const header = item.type === 'device' ? '  📱  Physical Devices' : '  💻  Simulators';
      write(`${c.bold}${c.dim}${header}${c.reset}\n`);
      lastType = item.type;
    }

    const isCurrent = i === cursor;
    const tag = item.type === 'device'
      ? `${c.yellow}device${c.reset}`
      : `${c.blue}sim${c.reset}`;

    if (isCurrent) {
      write(`  ${c.green}${c.bold}▸ ${item.label}${c.reset}  ${tag}\n`);
    } else {
      write(`  ${c.dim}  ${item.label}${c.reset}  ${tag}\n`);
    }
  }

  write(`\n${c.dim}${'─'.repeat(60)}${c.reset}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const items = getDestinations();

  if (items.length === 0) {
    console.error('No iOS devices or simulators found.');
    process.exit(1);
  }

  let cursor = 0;

  // Enable raw mode for keypress handling
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');
  hideCursor();

  render(items, cursor);

  const selected = await new Promise(resolve => {
    process.stdin.on('data', key => {
      // Ctrl-C / q → quit
      if (key === '\x03' || key === 'q') {
        showCursor();
        clearScreen();
        moveTo(1, 1);
        write(`${c.yellow}Cancelled.${c.reset}\n`);
        process.exit(0);
      }

      // Arrow up / k
      if (key === '\x1b[A' || key === 'k') {
        cursor = cursor > 0 ? cursor - 1 : items.length - 1;
        render(items, cursor);
      }

      // Arrow down / j
      if (key === '\x1b[B' || key === 'j') {
        cursor = cursor < items.length - 1 ? cursor + 1 : 0;
        render(items, cursor);
      }

      // Enter
      if (key === '\r') {
        resolve(items[cursor]);
      }
    });
  });

  // Clean up terminal
  process.stdin.setRawMode(false);
  process.stdin.pause();
  showCursor();
  clearScreen();
  moveTo(1, 1);

  write(`${c.green}${c.bold}✅ ${selected.label}${c.reset}  `);
  if (selected.type === 'device') {
    write(`${c.yellow}(physical device)${c.reset}\n\n`);
  } else {
    write(`${c.blue}(simulator)${c.reset}\n\n`);
  }

  const cwd = path.join(__dirname, '..');

  // Launch
  if (selected.type === 'sim') {
    // Boot the simulator if not already booted
    try {
      const bootState = execSync(
        `xcrun simctl list devices | grep "${selected.id}"`,
        {encoding: 'utf-8'},
      );
      if (!bootState.includes('Booted')) {
        write(`${c.blue}ℹ️  Booting simulator '${selected.name} (${selected.ver})'...${c.reset}\n`);
        try { execSync(`xcrun simctl boot "${selected.id}"`, {stdio: 'ignore'}); } catch {}
      }
    } catch {}

    const child = spawn(
      'pnpm', ['exec', 'rock', 'run:ios', '--device', selected.id],
      {stdio: 'inherit', cwd},
    );
    child.on('exit', code => process.exit(code || 0));
  } else {
    // Physical device — delegate to run-on-device.sh which handles metro host swap
    const script = path.join(__dirname, 'run-on-device.sh');
    const child = spawn(script, [selected.name], {stdio: 'inherit', cwd});
    child.on('exit', code => process.exit(code || 0));
  }
}

process.on('SIGINT', () => {
  showCursor();
  process.exit(0);
});

main().catch(err => {
  showCursor();
  console.error(err);
  process.exit(1);
});
