#!/usr/bin/env node
/**
 * Tạo file ZIP backup toàn bộ project (không bao gồm node_modules, backups, .git).
 * Chạy: npm run backup
 */
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backups');

const EXCLUDE_DIRS = new Set(['node_modules', 'backups', '.git', 'screenshots', 'scratch']);
const EXCLUDE_EXT = new Set(['.log']);

function shouldExclude(relPath) {
  const parts = relPath.split(path.sep);
  if (EXCLUDE_DIRS.has(parts[0])) return true;
  if (EXCLUDE_EXT.has(path.extname(relPath))) return true;
  return false;
}

function collectFiles(dir, base = ROOT) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (shouldExclude(rel)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      results.push({ full, rel });
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipName = `cmms-backup-${timestamp}.zip`;
  const zipPath = path.join(BACKUP_DIR, zipName);

  const zip = new AdmZip();
  const files = collectFiles(ROOT);

  for (const { full, rel } of files) {
    const zipEntry = rel.replace(/\\/g, '/');
    zip.addFile(zipEntry, fs.readFileSync(full));
  }

  zip.writeZip(zipPath);
  console.log(`Backup created: backups/${zipName} (${files.length} files)`);
}

main();
