#!/usr/bin/env node
'use strict';

/**
 * Data migration script: import từ backup OPS cũ vào CMMS mới.
 * Chạy dry-run:  node import.js
 * Chạy thật:     node import.js --apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const ZIP_PATH = path.resolve(__dirname, '../Backup/ops-data-export-20260503-033201.zip');
const DB_PATH = path.resolve(__dirname, 'data/db.json');
const BACKUP_ENTRY = 'ops-data-export-20260503-033201/combined-export.json';
const DEFAULT_PASSWORD = 'Hapulico@2026';
const APPLY = process.argv.includes('--apply');

// ── Helpers ──────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function now() { return new Date().toISOString(); }

function padNum(n, len = 4) { return String(n).padStart(len, '0'); }

function loadBackup() {
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Không tìm thấy file backup: ${ZIP_PATH}`);
  }
  const zip = new AdmZip(ZIP_PATH);
  const entry = zip.getEntry(BACKUP_ENTRY);
  if (!entry) throw new Error(`Không tìm thấy ${BACKUP_ENTRY} trong zip`);
  return JSON.parse(zip.readAsText(entry));
}

function loadDB() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Không tìm thấy DB: ${DB_PATH}`);
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  const backup = DB_PATH.replace('.json', `.backup-${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, backup);
  console.log(`  Backup DB cũ → ${path.basename(backup)}`);
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// ── Migration: Users ──────────────────────────────────────────────────

function migrateUsers(srcUsers, db) {
  const added = [];
  const skipped = [];
  const existingUsernames = new Set(db.users.map(u => u.username));

  for (const src of srcUsers) {
    if (existingUsernames.has(src.username)) {
      skipped.push(src.username);
      continue;
    }
    // Mật khẩu cũ dùng SHA256 đơn giản, không tương thích PBKDF2 của hệ thống mới.
    // Gán mật khẩu mặc định; người dùng cần đổi sau khi đăng nhập lần đầu.
    const user = {
      id: `u${Date.now()}${Math.floor(Math.random() * 9999)}`,
      username: src.username,
      name: src.username,
      role: src.role === 'admin' ? 'admin' : 'operator',
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      importedFromOps: true,
      createdAt: src.createdAt || now()
    };
    db.users.push(user);
    existingUsernames.add(src.username);
    added.push(src.username);
  }
  return { added, skipped };
}

// ── Migration: Records → WorkOrders ─────────────────────────────────

function migrateRecords(srcRecords, db) {
  const added = [];
  const skipped = [];

  // Tập hợp các OPS record ID đã import trước đó (tránh trùng lặp khi chạy lại)
  const importedOpsIds = new Set(
    db.workOrders.filter(wo => wo.opsSourceId).map(wo => wo.opsSourceId)
  );

  // Map username → userId trong DB mới
  const userMap = {};
  for (const u of db.users) userMap[u.username] = u.id;

  for (const rec of srcRecords) {
    if (importedOpsIds.has(rec.id)) {
      skipped.push(rec.title);
      continue;
    }

    const woNum = db.nextId.workOrder++;
    const status = rec.status === 'monitoring' ? 'in-progress' : 'open';
    const createdById = userMap[rec.createdBy] || 'u1';

    db.workOrders.push({
      id: `WO-${padNum(woNum)}`,
      title: rec.title,
      description: rec.note || '',
      assetId: null,
      priority: 'medium',
      assignedTo: '',
      type: 'corrective',
      status,
      createdBy: createdById,
      opsSourceId: rec.id,
      createdAt: rec.createdAt || now(),
      updatedAt: rec.createdAt || now(),
      history: [{
        action: 'imported from OPS system',
        by: 'system',
        at: now()
      }]
    });
    added.push(rec.title);
  }
  return { added, skipped };
}

// ── Migration: Pumps → Assets ─────────────────────────────────────────

function migratePumps(pumps, db) {
  const added = [];
  const skipped = [];

  const importedOpsIds = new Set(
    db.assets.filter(a => a.opsSourceId).map(a => a.opsSourceId)
  );

  for (const pump of pumps) {
    const opsId = `pump-${pump.id}`;
    if (importedOpsIds.has(opsId)) {
      skipped.push(pump.name);
      continue;
    }

    const assetNum = db.nextId.asset++;
    const isMainPump = pump.id <= 3;

    db.assets.push({
      id: `A${padNum(assetNum)}`,
      name: pump.name,
      code: `A${padNum(assetNum)}`,
      category: isMainPump ? 'Bơm tưới chính' : 'Bơm LK',
      location: isMainPump
        ? 'Trạm bơm chính'
        : `Giếng ${pump.name.replace('Bơm ', '')}`,
      manufacturer: '',
      model: '',
      installDate: '',
      status: pump.state === 1 ? 'active' : 'inactive',
      opsSourceId: opsId,
      createdAt: now(),
      updatedAt: now()
    });
    added.push(pump.name);
  }
  return { added, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   CMMS Data Migration (OPS → CMMS)   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Nguồn: ${ZIP_PATH}`);
  console.log(`Đích:   ${DB_PATH}`);
  if (!APPLY) {
    console.log('\n⚠  DRY RUN — chạy với --apply để ghi thật\n');
  }

  const backup = loadBackup();
  // Dùng service_3080_current (live data) làm nguồn chính
  const source = backup.datasets.service_3080_current;
  if (!source) throw new Error('Không tìm thấy dataset service_3080_current');

  const db = loadDB();

  // 1. Users
  const userRes = migrateUsers(source.users, db);
  console.log(`\n[Users]`);
  console.log(`  Thêm mới (${userRes.added.length}): ${userRes.added.join(', ') || 'không có'}`);
  console.log(`  Bỏ qua   (${userRes.skipped.length}): ${userRes.skipped.join(', ') || 'không có'}`);
  if (userRes.added.length) {
    console.log(`  Mật khẩu mặc định: ${DEFAULT_PASSWORD} (yêu cầu đổi sau khi đăng nhập)`);
  }

  // 2. Records → WorkOrders
  const woRes = migrateRecords(source.records, db);
  console.log(`\n[Work Orders (từ OPS Records)]`);
  console.log(`  Thêm mới (${woRes.added.length}):`);
  woRes.added.forEach(t => console.log(`    + ${t}`));
  if (woRes.skipped.length) console.log(`  Bỏ qua (đã tồn tại): ${woRes.skipped.length}`);

  // 3. Pumps → Assets
  const kysonSnapshot = source.kyson?.snapshot;
  let assetRes = { added: [], skipped: [] };
  if (kysonSnapshot?.pump) {
    assetRes = migratePumps(kysonSnapshot.pump, db);
    console.log(`\n[Assets (Bơm từ KySon)]`);
    console.log(`  Thêm mới (${assetRes.added.length}):`);
    assetRes.added.forEach(n => console.log(`    + ${n}`));
    if (assetRes.skipped.length) console.log(`  Bỏ qua (đã tồn tại): ${assetRes.skipped.length}`);
  }

  console.log(`\n[Tổng kết]`);
  console.log(`  Users: +${userRes.added.length}`);
  console.log(`  WorkOrders: +${woRes.added.length}`);
  console.log(`  Assets: +${assetRes.added.length}`);
  console.log(`  nextId sau: asset=${db.nextId.asset}, workOrder=${db.nextId.workOrder}`);

  if (APPLY) {
    saveDB(db);
    console.log('\n✅ Migration hoàn tất! Dữ liệu đã được ghi vào db.json.');
  } else {
    console.log('\nChạy lại với --apply để áp dụng thay đổi.');
  }
}

main();
