#!/usr/bin/env bash
set -euo pipefail

# CocoaPods aborts without a UTF-8 locale ("Unicode Normalization not appropriate
# for ASCII-8BIT") and fastlane warns on every run. macOS populates LANG only from
# Terminal.app's locale preference, so it is empty whenever this runs outside a
# terminal. Pin it before any pod/bundle work below.
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/../.." && pwd)"
PROJECT_RUBY_VERSION_FILE="$ROOT_DIR/.ruby-version"

log() {
  printf '%s %s\n' "$1" "${*:2}"
}

abort() {
  log "❌" "$*"
  exit 1
}

require_ruby_version() {
  if [[ ! -f "$PROJECT_RUBY_VERSION_FILE" ]]; then
    log "ℹ️" "No .ruby-version file found; skipping Ruby version enforcement."
    return
  fi

  REQUIRED_RUBY_VERSION="$(<"$PROJECT_RUBY_VERSION_FILE")"

  if ! command -v ruby >/dev/null 2>&1; then
    abort "Ruby is not installed. Install Ruby $REQUIRED_RUBY_VERSION (e.g. via mise, rbenv, or rvm) and retry."
  fi

  ACTIVE_RUBY_VERSION="$(ruby -e 'print RUBY_VERSION')"

  if [[ "$ACTIVE_RUBY_VERSION" == "$REQUIRED_RUBY_VERSION" ]]; then
    log "✅" "Ruby $ACTIVE_RUBY_VERSION detected (matches project requirement)."
    return
  fi

  if [[ "${IGNORE_RUBY_VERSION:-}" == "1" ]]; then
    log "⚠️" "Using Ruby $ACTIVE_RUBY_VERSION (project requires $REQUIRED_RUBY_VERSION) because IGNORE_RUBY_VERSION=1."
    return
  fi

  MESSAGE=$(
    cat <<EOF
Ruby version mismatch.
  Required: $REQUIRED_RUBY_VERSION
  Active:   $ACTIVE_RUBY_VERSION

Set up Ruby $REQUIRED_RUBY_VERSION (examples):
  • mise:   mise install ruby@$REQUIRED_RUBY_VERSION && mise use ruby@$REQUIRED_RUBY_VERSION
  • rbenv:  rbenv install $REQUIRED_RUBY_VERSION && rbenv local $REQUIRED_RUBY_VERSION
  • rvm:    rvm install $REQUIRED_RUBY_VERSION && rvm use $REQUIRED_RUBY_VERSION

Override temporarily by exporting IGNORE_RUBY_VERSION=1.
EOF
  )

  if [[ -t 0 && -t 1 ]]; then
    log "⚠️" "$MESSAGE"
    read -r -p "Continue anyway? (y/N) " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      abort "Aborting to allow Ruby toolchain alignment."
    fi
    log "⚠️" "Continuing with Ruby $ACTIVE_RUBY_VERSION."
  else
    abort "$MESSAGE"
  fi
}

# ── Dependency freshness ─────────────────────────────────────────────────────
# Checking that node_modules/ and Pods/ merely *exist* is not enough: a Pods
# sandbox left over from before a native dependency was added looks perfectly
# healthy on disk, then Xcode's "[CP] Check Pods Manifest.lock" build phase kills
# the archive ~4 minutes in with "The sandbox is not in sync with the
# Podfile.lock". The checks below are the same comparisons Xcode and pnpm make,
# so the failure surfaces here — before the build — with an offer to fix it.

# True when JS deps look stale. pnpm rewrites node_modules/.modules.yaml at the
# end of every install, so a lockfile newer than that marker means the tree was
# never reinstalled after the lockfile changed (a branch switch, a pull, a merge).
# A git operation that rewrites pnpm-lock.yaml without changing its contents can
# trip this too — a spurious `pnpm i` is cheap, a broken archive is not.
js_deps_stale() {
  local marker="$REPO_ROOT/node_modules/.modules.yaml"
  local lock="$REPO_ROOT/pnpm-lock.yaml"

  [[ -d "$ROOT_DIR/node_modules" ]] || return 0
  [[ -f "$marker" ]] || return 0
  [[ -f "$lock" ]] || return 1
  [[ "$lock" -nt "$marker" ]]
}

# True when the Pods sandbox is stale. `pod install` copies Podfile.lock to
# Pods/Manifest.lock as its final step, so any difference means the install never
# ran (or died partway). This is byte-for-byte what Xcode's check does.
pods_stale() {
  local podfile_lock="$ROOT_DIR/ios/Podfile.lock"
  local manifest="$ROOT_DIR/ios/Pods/Manifest.lock"

  [[ -d "$ROOT_DIR/ios/Pods" ]] || return 0
  [[ -f "$manifest" ]] || return 0
  [[ -f "$podfile_lock" ]] || return 1
  ! diff -q "$podfile_lock" "$manifest" >/dev/null 2>&1
}

# Emit "<pod> <checksum>" for each entry in a lockfile's SPEC CHECKSUMS block.
spec_checksums() {
  [[ -f "$1" ]] || return 0
  awk '
    /^SPEC CHECKSUMS:/ { inblock = 1; next }
    inblock && /^[^[:space:]]/ { inblock = 0 }
    inblock && NF == 2 { sub(/:$/, "", $1); print $1, $2 }
  ' "$1"
}

# Show *which* pods drifted — the difference between "run pod install" and
# knowing the archive died because a native dependency was never installed.
describe_pod_drift() {
  # No `trap ... RETURN` here: without `set -T` bash does not scope a RETURN trap
  # to the function that installed it, so it stays armed and re-fires when the
  # *next* function returns — by then $wanted/$have are gone and `set -u` kills
  # the script. Clean up explicitly instead.
  local wanted have
  wanted="$(mktemp)"
  have="$(mktemp)"

  spec_checksums "$ROOT_DIR/ios/Podfile.lock" >"$wanted"
  spec_checksums "$ROOT_DIR/ios/Pods/Manifest.lock" >"$have"

  local drift
  drift="$(
    awk '
      NR == FNR { want[$1] = $2; next }
      { have[$1] = $2 }
      END {
        for (p in want) {
          if (!(p in have))            { printf "  + %s (not installed)\n", p }
          else if (have[p] != want[p]) { printf "  ~ %s (version changed)\n", p }
        }
        for (p in have) {
          if (!(p in want))            { printf "  - %s (no longer required)\n", p }
        }
      }
    ' "$wanted" "$have" | sort -k2
  )"

  rm -f "$wanted" "$have"

  [[ -n "$drift" ]] || return 0

  local total
  total="$(printf '%s\n' "$drift" | wc -l | tr -d ' ')"
  printf '%s\n' "$drift" | head -15
  (( total > 15 )) && log "  " "…and $(( total - 15 )) more."
  return 0
}

# `pod` comes from the project Gemfile, so it must be invoked through bundler to
# get the pinned CocoaPods. Falls back to whatever is on PATH when gem install
# was skipped (SKIP_BUNDLE_INSTALL=1).
pod_install() {
  if BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec pod --version >/dev/null 2>&1; then
    (cd "$ROOT_DIR/ios" && BUNDLE_GEMFILE="$ROOT_DIR/Gemfile" bundle exec pod install)
  elif command -v pod >/dev/null 2>&1; then
    log "⚠️" "Using the pod on PATH (bundler's CocoaPods is unavailable)."
    (cd "$ROOT_DIR/ios" && pod install)
  else
    abort "CocoaPods not found. Run 'bundle install' in $ROOT_DIR, then retry."
  fi
}

js_install() {
  command -v pnpm >/dev/null 2>&1 ||
    abort "pnpm not found, but this is a pnpm workspace. Install it (npm i -g pnpm) and retry."
  (cd "$REPO_ROOT" && pnpm install)
}

ensure_prerequisites() {
  if [[ "${SKIP_DEPS_CHECK:-}" == "1" ]]; then
    log "ℹ️" "Skipping dependency freshness check because SKIP_DEPS_CHECK=1."
    return
  fi

  local -a stale=()
  js_deps_stale && stale+=("js")
  pods_stale && stale+=("pods")

  if (( ${#stale[@]} == 0 )); then
    log "✅" "node_modules and Pods are in sync with their lockfiles."
    return
  fi

  local -a fix_commands=()

  if [[ " ${stale[*]} " == *" js "* ]]; then
    log "⚠️" "JS dependencies are out of date (pnpm-lock.yaml is newer than node_modules)."
    fix_commands+=("pnpm install   # at $REPO_ROOT")
  fi

  if [[ " ${stale[*]} " == *" pods "* ]]; then
    log "⚠️" "CocoaPods sandbox is out of sync with ios/Podfile.lock."
    log "  " "Xcode will fail this build in its 'Check Pods Manifest.lock' phase. Drift:"
    describe_pod_drift
    fix_commands+=("cd $ROOT_DIR/ios && bundle exec pod install")
  fi

  # `pod install` reads the autolinking config out of node_modules, so a stale JS
  # tree has to be repaired first or the pods it generates are wrong again.
  local answer
  if [[ "${AUTO_INSTALL_DEPS:-}" == "1" ]]; then
    log "➡️" "AUTO_INSTALL_DEPS=1 — installing without prompting."
    answer="y"
  elif [[ -t 0 && -t 1 ]]; then
    printf '\nThis will run:\n'
    printf '  %s\n' "${fix_commands[@]}"
    read -r -p "Install now? (y/N) " answer
  else
    abort "$(
      printf 'Dependencies are stale and this shell is not interactive. Run:\n'
      printf '  %s\n' "${fix_commands[@]}"
      printf 'Or rerun with AUTO_INSTALL_DEPS=1 to fix automatically.\n'
    )"
  fi

  [[ "$answer" =~ ^[Yy]$ ]] ||
    abort "Dependencies are stale. Run the commands above, then retry."

  if [[ " ${stale[*]} " == *" js "* ]]; then
    log "➡️" "Installing JS dependencies (pnpm install)…"
    js_install
  fi

  # Re-check rather than assuming: `pnpm install` can pull in a new native module,
  # which makes the pods stale even when they looked fine a moment ago.
  if pods_stale; then
    log "➡️" "Installing CocoaPods dependencies (pod install)…"
    pod_install
  fi

  pods_stale && abort "Pods are still out of sync after 'pod install'. Resolve the errors above."

  log "✅" "Dependencies are now in sync."
}

ensure_bundler() {
  if ! command -v bundle >/dev/null 2>&1; then
    abort "Bundler (bundle) not found. Install it with: gem install bundler"
  fi
}

maybe_install_gems() {
  if [[ "${SKIP_BUNDLE_INSTALL:-}" == "1" ]]; then
    log "ℹ️" "Skipping bundle install because SKIP_BUNDLE_INSTALL=1."
    return
  fi

  export BUNDLE_GEMFILE="$ROOT_DIR/Gemfile"
  export BUNDLE_PATH="${BUNDLE_PATH:-$ROOT_DIR/vendor/bundle}"

  if bundle check >/dev/null 2>&1; then
    log "✅" "Ruby gems already installed."
    return
  fi

  log "➡️" "Installing Ruby gems (fastlane, etc.)…"
  if ! bundle install --quiet; then
    log "⚠️" "bundle install failed, retrying with --force…"
    if ! bundle install --quiet --force; then
      abort "bundle install failed. Resolve the errors above or rerun with SKIP_BUNDLE_INSTALL=1 to bypass."
    fi
  fi
}

main() {
  # Order matters: ensure_prerequisites may need to run `bundle exec pod install`,
  # so the Ruby toolchain and the Gemfile's CocoaPods have to be ready first.
  require_ruby_version
  ensure_bundler
  maybe_install_gems
  ensure_prerequisites
}

main "$@"
