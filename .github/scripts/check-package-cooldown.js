/**
 * Package Cooldown Check
 *
 * Prevents PRs from being merged if they introduce packages
 * that were published within the cooldown period (default: 7 days).
 *
 * This protects against supply chain attacks like the axios compromise
 * where malicious versions are typically detected within 24-48 hours.
 *
 * To bypass for trusted packages, add them to .github/package-cooldown-allowlist.json
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COOLDOWN_DAYS = parseInt(process.env.COOLDOWN_DAYS || '6', 10);
const LOCKFILE_PATHS = (
  process.env.LOCKFILE_PATHS || 'package-lock.json'
).split(',');
const ALLOWLIST_PATH =
  process.env.ALLOWLIST_PATH || '.github/package-cooldown-allowlist.json';

/**
 * Load the allowlist from file.
 * Format: { "allowlist": [{ "name": "pkg", "version": "1.0.0", "reason": "...", "approvedBy": "..." }] }
 * Version can be "*" to allow all versions, or a specific version like "1.0.0"
 */
function loadAllowlist() {
  try {
    if (fs.existsSync(ALLOWLIST_PATH)) {
      const data = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
      return data.allowlist || [];
    }
  } catch (error) {
    console.log(`⚠️  Could not load allowlist: ${error.message}`);
  }
  return [];
}

/**
 * Check if a package is in the allowlist
 */
function isAllowlisted(packageName, version, allowlist) {
  return allowlist.find(
    (entry) =>
      entry.name === packageName &&
      (entry.version === '*' || entry.version === version)
  );
}

async function fetchPackageInfo(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}`;
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(
              new Error(`Failed to fetch ${packageName}: ${res.statusCode}`)
            );
          }
        });
      })
      .on('error', reject);
  });
}

function getPackagePublishDate(packageInfo, version) {
  const time = packageInfo.time;
  if (!time || !time[version]) {
    return null;
  }
  return new Date(time[version]);
}

function getDaysSincePublish(publishDate) {
  const now = new Date();
  const diffMs = now - publishDate;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function extractPackagesFromLockfile(lockfilePath) {
  if (!fs.existsSync(lockfilePath)) {
    return {};
  }
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  const packages = {};

  if (lockfile.packages) {
    for (const [key, value] of Object.entries(lockfile.packages)) {
      if (key.startsWith('node_modules/') && value.version) {
        const name = key.replace('node_modules/', '');
        if (!name.includes('node_modules/')) {
          packages[name] = value.version;
        }
      }
    }
  }

  return packages;
}

function getChangedPackages(baseLockfile, headLockfile) {
  const basePackages = extractPackagesFromLockfile(baseLockfile);
  const headPackages = extractPackagesFromLockfile(headLockfile);

  const changed = [];

  for (const [name, version] of Object.entries(headPackages)) {
    const baseVersion = basePackages[name];
    if (!baseVersion || baseVersion !== version) {
      changed.push({ name, version, previousVersion: baseVersion || null });
    }
  }

  return changed;
}

function getBaseLockfileContent(lockfilePath) {
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || 'master';
    const content = execSync(`git show origin/${baseBranch}:${lockfilePath}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const tempPath = `/tmp/base-${path.basename(lockfilePath)}`;
    fs.writeFileSync(tempPath, content);
    return tempPath;
  } catch {
    return null;
  }
}

async function checkPackageCooldown() {
  console.log(`\n🔒 Package Cooldown Check`);
  console.log(`   Cooldown period: ${COOLDOWN_DAYS} days\n`);

  const allowlist = loadAllowlist();
  if (allowlist.length > 0) {
    console.log(`📋 Allowlist loaded: ${allowlist.length} package(s)\n`);
  }

  const violations = [];
  const checked = [];
  const skipped = [];

  for (const lockfilePath of LOCKFILE_PATHS) {
    const trimmedPath = lockfilePath.trim();
    if (!fs.existsSync(trimmedPath)) {
      console.log(`⏭️  Skipping ${trimmedPath} (not found)`);
      continue;
    }

    console.log(`📦 Checking ${trimmedPath}...`);

    const baseLockfile = getBaseLockfileContent(trimmedPath);
    const changedPackages = baseLockfile
      ? getChangedPackages(baseLockfile, trimmedPath)
      : [];

    if (changedPackages.length === 0) {
      console.log(`   No package changes detected.\n`);
      continue;
    }

    console.log(`   Found ${changedPackages.length} new/updated package(s)\n`);

    for (const pkg of changedPackages) {
      try {
        const allowlistEntry = isAllowlisted(pkg.name, pkg.version, allowlist);
        if (allowlistEntry) {
          skipped.push({ ...pkg, reason: allowlistEntry.reason });
          console.log(
            `   ⏭️  ${pkg.name}@${pkg.version} - ALLOWLISTED (${allowlistEntry.reason})`
          );
          continue;
        }

        const packageInfo = await fetchPackageInfo(pkg.name);
        const publishDate = getPackagePublishDate(packageInfo, pkg.version);

        if (!publishDate) {
          console.log(
            `   ⚠️  ${pkg.name}@${pkg.version} - publish date not found`
          );
          continue;
        }

        const daysSince = getDaysSincePublish(publishDate);
        checked.push({ ...pkg, daysSince, publishDate });

        if (daysSince < COOLDOWN_DAYS) {
          violations.push({
            ...pkg,
            daysSince,
            publishDate,
            lockfile: trimmedPath
          });
          console.log(
            `   ❌ ${pkg.name}@${pkg.version} - published ${daysSince} day(s) ago (${publishDate.toISOString().split('T')[0]})`
          );
        } else {
          console.log(
            `   ✅ ${pkg.name}@${pkg.version} - published ${daysSince} day(s) ago`
          );
        }
      } catch (error) {
        console.log(`   ⚠️  ${pkg.name}@${pkg.version} - ${error.message}`);
      }
    }
    console.log();
  }

  if (violations.length > 0) {
    console.log(`\n🚨 COOLDOWN VIOLATION DETECTED`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(
      `The following package(s) were published less than ${COOLDOWN_DAYS} days ago:\n`
    );

    for (const v of violations) {
      console.log(`  • ${v.name}@${v.version}`);
      console.log(
        `    Published: ${v.publishDate.toISOString().split('T')[0]} (${v.daysSince} day(s) ago)`
      );
      if (v.previousVersion) {
        console.log(`    Previous:  ${v.previousVersion}`);
      }
      console.log(`    Lockfile:  ${v.lockfile}\n`);
    }

    console.log(`Why this check exists:`);
    console.log(`  Supply chain attacks (like the axios compromise) typically`);
    console.log(
      `  publish malicious versions that are detected within 24-48 hours.`
    );
    console.log(
      `  Waiting ${COOLDOWN_DAYS} days before adopting new versions provides`
    );
    console.log(`  a safety buffer for the community to identify issues.\n`);

    console.log(`To resolve:`);
    console.log(`  1. Wait ${COOLDOWN_DAYS} days for the package to "mature"`);
    console.log(`  2. Or revert to a previously published version`);
    console.log(`  3. Or add to .github/package-cooldown-allowlist.json:\n`);
    console.log(`     {`);
    console.log(`       "allowlist": [`);
    for (const v of violations) {
      console.log(`         {`);
      console.log(`           "name": "${v.name}",`);
      console.log(`           "version": "${v.version}",`);
      console.log(`           "reason": "Required for <explain why>",`);
      console.log(`           "approvedBy": "<your-github-username>",`);
      console.log(
        `           "approvedAt": "${new Date().toISOString().split('T')[0]}"`
      );
      console.log(`         },`);
    }
    console.log(`       ]`);
    console.log(`     }\n`);

    process.exit(1);
  }

  const totalProcessed = checked.length + skipped.length;
  if (totalProcessed > 0) {
    let summary = `✅ All ${totalProcessed} new/updated package(s) passed`;
    if (skipped.length > 0) {
      summary += ` (${skipped.length} allowlisted)`;
    }
    console.log(`${summary}.\n`);
  } else {
    console.log(`✅ No new packages to check.\n`);
  }
}

checkPackageCooldown().catch((error) => {
  console.error('Error running cooldown check:', error);
  process.exit(1);
});
