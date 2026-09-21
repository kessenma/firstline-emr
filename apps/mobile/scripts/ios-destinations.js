#!/usr/bin/env node

/**
 * Shared iOS destination discovery for FajrEMR.
 *
 * Simulator names are NOT unique — the same name exists on every installed
 * runtime (e.g. "iPhone 17 Pro" on 26.2, 26.5 and 27.0). Anything that targets
 * a simulator must do so by UDID, or xcodebuild/rock silently picks the first
 * match, which is the oldest runtime.
 *
 * Also usable as a CLI to resolve a name to a UDID on the newest runtime:
 *   node scripts/ios-destinations.js "iPhone 17 Pro"
 *   node scripts/ios-destinations.js "iPhone 17 Pro" 26.5   # pin a runtime
 */

const {execSync} = require('child_process');

// "iPhone 17 Pro Simulator (27.0) (5E846159-45E3-4139-9CD9-0C5BE25E0248)"
const DEST_RE = /^(.+?)\s+\(([^)]+)\)\s+\(([A-Fa-f0-9-]{24,36})\)$/;

/** Compare dotted version strings numerically ("26.10" > "26.5"). */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

/** All physical devices and iOS simulators, devices first. */
function getDestinations() {
  const raw = execSync('xcrun xctrace list devices 2>&1', {encoding: 'utf-8'});
  const items = [];

  let section = null;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t === '== Devices ==') { section = 'device'; continue; }
    if (t === '== Simulators ==') { section = 'sim'; continue; }
    if (!section || !t) continue;

    const m = t.match(DEST_RE);
    if (!m) continue;

    const [, rawName, ver, uuid] = m;
    const name = rawName.trim();

    if (section === 'device') {
      items.push({type: 'device', name, ver, id: uuid, label: `${name} (${ver})`});
    } else if (/iphone|ipad/i.test(name)) {
      items.push({
        type: 'sim',
        name: name.replace(/\s+Simulator$/i, ''),
        ver,
        id: uuid,
        label: `${name} (${ver})`,
      });
    }
  }
  return items;
}

/**
 * Resolve a simulator name to a single destination.
 * Picks the newest installed runtime unless `os` is given.
 * Throws with the available runtimes listed if there is no match.
 */
function resolveSimulator(name, os) {
  const wanted = name.trim().toLowerCase();
  const matches = getDestinations().filter(
    d => d.type === 'sim' && d.name.toLowerCase() === wanted,
  );

  if (matches.length === 0) {
    throw new Error(`No simulator named '${name}'. Run 'xcrun xctrace list devices' to see what's installed.`);
  }

  if (os) {
    const pinned = matches.find(d => d.ver === os);
    if (!pinned) {
      const have = matches.map(d => d.ver).join(', ');
      throw new Error(`No '${name}' simulator on iOS ${os}. Installed runtimes: ${have}`);
    }
    return pinned;
  }

  return matches.sort((a, b) => compareVersions(b.ver, a.ver))[0];
}

module.exports = {getDestinations, resolveSimulator, compareVersions};

// CLI: print the resolved UDID so shell callers can pass it to --device.
if (require.main === module) {
  const [name, os] = process.argv.slice(2);
  if (!name) {
    console.error('Usage: ios-destinations.js <simulator name> [os version]');
    process.exit(1);
  }
  try {
    const sim = resolveSimulator(name, os);
    // Progress goes to stderr so stdout stays a clean UDID.
    console.error(`Targeting ${sim.name} (${sim.ver})`);
    console.log(sim.id);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
