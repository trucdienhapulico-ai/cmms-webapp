#!/usr/bin/env node
'use strict';

/**
 * One-time script: reset admin password to admin123
 * Run with: node scripts/reset-admin.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const TARGET_PASSWORD = 'admin123';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return attempt === hash;
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`[reset-admin] ERROR: DB not found at ${DB_PATH}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const admin = db.users.find(u => u.username === 'admin');

if (!admin) {
  console.error('[reset-admin] ERROR: No admin user found in db.json');
  process.exit(1);
}

const alreadyCorrect = verifyPassword(TARGET_PASSWORD, admin.passwordHash);
console.log(`[reset-admin] Current hash matches "${TARGET_PASSWORD}": ${alreadyCorrect}`);

admin.passwordHash = hashPassword(TARGET_PASSWORD);
admin.mustChangePassword = false;

const verify = verifyPassword(TARGET_PASSWORD, admin.passwordHash);
console.log(`[reset-admin] New hash verification: ${verify}`);

if (!verify) {
  console.error('[reset-admin] FATAL: New hash verification failed!');
  process.exit(1);
}

const tmp = DB_PATH + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
fs.renameSync(tmp, DB_PATH);

console.log(`[reset-admin] SUCCESS: admin password reset to "${TARGET_PASSWORD}", mustChangePassword=false`);
