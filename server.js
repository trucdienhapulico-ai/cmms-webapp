'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3090;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.ADMIN_RESET_PASSWORD || '123456';

// ─── Trust proxy (Synology Reverse Proxy / Cloudflare Tunnel) ─
app.set('trust proxy', 1);

// ─── HTTPS redirect (khi chạy sau reverse proxy) ─────────────
app.use((req, res, next) => {
  if (IS_PROD && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ─── Security headers ─────────────────────────────────────────
app.use((req, res, next) => {
  // Bỏ includeSubDomains để không ảnh hưởng đến các cổng 8080, 8081
  res.setHeader('Strict-Transport-Security', 'max-age=3600'); 
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ─── Rate limiting ────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: 0, error: 'Quá nhiều request, thử lại sau.' }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: 0, error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' }
});

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB Cache ─────────────────────────────────────────────────
let _dbCache = null;
let _dbMtime = 0;

function loadDB() {
  if (_dbCache) {
    // Cheap stat check — detects external file edits without reading content
    try {
      const mtime = fs.statSync(DB_PATH).mtimeMs;
      if (mtime === _dbMtime) return _dbCache;
    } catch {}
    _dbCache = null;
  }

  if (!fs.existsSync(DB_PATH)) { initDB(); return _dbCache; }

  let db;
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('[CMMS] db.json corrupted, reinitializing:', e.message);
    initDB();
    return _dbCache;
  }

  // Migrate missing collections — single save pass instead of one per field
  let dirty = false;
  const defaults = {
    checklists: [], maintenanceLogs: [], pmSchedules: [],
    inventory: [], inventoryTx: [], notifications: [],
    tenantRequests: [], shifts: [], auditLogs: [],
    vendors: [], purchaseOrders: [], apiKeys: [], webhooks: []
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (!db[key]) { db[key] = val; dirty = true; }
  }
  if (!db.checklistTemplates || db.checklistTemplates.length === 0) {
    db.checklistTemplates = getDefaultTemplates();
    dirty = true;
  }
  _dbCache = db;
  if (dirty) saveDB(db);
  return db;
}

function saveDB(db) {
  _dbCache = db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  try { _dbMtime = fs.statSync(DB_PATH).mtimeMs; } catch {}
}

function initDB() {
  if (IS_PROD && !process.env.INITIAL_ADMIN_PASSWORD && !process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    console.error('[CMMS] FATAL: Set INITIAL_ADMIN_PASSWORD env var before initializing the database in production.');
    process.exit(1);
  }
  const db = {
    users: [{
      id: 'u1', username: 'admin', role: 'admin',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      name: 'Administrator', createdAt: now(),
      mustChangePassword: true
    }],
    assets: [],
    workOrders: [],
    checklists: [],
    checklistTemplates: getDefaultTemplates(),
    maintenanceLogs: [],
    pmSchedules: [],
    inventory: [],
    inventoryTx: [],
    notifications: [],
    tenantRequests: [],
    shifts: [],
    auditLogs: [],
    vendors: [],
    purchaseOrders: [],
    apiKeys: [],
    webhooks: [],
    nextId: { asset: 1, workOrder: 1 }
  };
  saveDB(db);
}

function getDefaultTemplates() {
  return [
    {
      id: 'tpl-pump', name: 'Kiểm tra máy bơm nước', category: 'PCCC',
      items: [
        { id: 1, label: 'Áp suất đầu ra', type: 'number', unit: 'bar' },
        { id: 2, label: 'Nhiệt độ động cơ bình thường', type: 'status' },
        { id: 3, label: 'Không có tiếng ồn bất thường', type: 'status' },
        { id: 4, label: 'Không rò rỉ dầu/nước', type: 'status' },
        { id: 5, label: 'Đèn báo hoạt động bình thường', type: 'status' }
      ]
    },
    {
      id: 'tpl-elevator', name: 'Kiểm tra thang máy', category: 'Thang máy',
      items: [
        { id: 1, label: 'Cửa đóng/mở bình thường', type: 'status' },
        { id: 2, label: 'Không rung lắc khi vận hành', type: 'status' },
        { id: 3, label: 'Đèn và nút nhấn hoạt động', type: 'status' },
        { id: 4, label: 'Dừng tầng chính xác', type: 'status' },
        { id: 5, label: 'Nhiệt độ phòng máy', type: 'number', unit: '°C' }
      ]
    },
    {
      id: 'tpl-elec', name: 'Kiểm tra tủ điện', category: 'Hệ thống điện',
      items: [
        { id: 1, label: 'Điện áp pha A', type: 'number', unit: 'V' },
        { id: 2, label: 'Điện áp pha B', type: 'number', unit: 'V' },
        { id: 3, label: 'Điện áp pha C', type: 'number', unit: 'V' },
        { id: 4, label: 'Không có MCB trip', type: 'status' },
        { id: 5, label: 'Không có mùi cháy/dây nóng', type: 'status' },
        { id: 6, label: 'Đèn nguồn bình thường', type: 'status' }
      ]
    },
    {
      id: 'tpl-general', name: 'Kiểm tra tổng quát thiết bị', category: 'Khác',
      items: [
        { id: 1, label: 'Thiết bị hoạt động bình thường', type: 'status' },
        { id: 2, label: 'Không có hư hỏng nhìn thấy', type: 'status' },
        { id: 3, label: 'Khu vực xung quanh sạch sẽ', type: 'status' },
        { id: 4, label: 'Ghi chú bổ sung', type: 'text' }
      ]
    }
  ];
}

// ─── Auth helpers ─────────────────────────────────────────────
const sessions = new Map();

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
function createSession(user) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, { userId: user.id, role: user.role, name: user.name, username: user.username, createdAt: Date.now() });
  return sid;
}
function getSession(req) {
  const sid = req.cookies?.sid;
  return sid ? sessions.get(sid) : null;
}
function requireAuth(roles = []) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ ok: 0, error: 'Chưa đăng nhập' });
    if (roles.length && !roles.includes(session.role)) return res.status(403).json({ ok: 0, error: 'Không có quyền' });
    req.session = session;
    next();
  };
}

function now() { return new Date().toISOString(); }

function logAudit(req, action, entity, entityId, details = '', actor = null) {
  const db = loadDB();
  if (!db.auditLogs) db.auditLogs = [];
  const session = getSession(req);
  const userId = actor?.userId || session?.userId || null;
  const userName = actor?.username || session?.username || 'system';
  db.auditLogs.unshift({
    id: `AUDIT-${Date.now()}`,
    action,
    entity,
    entityId: entityId || null,
    userId,
    userName,
    details,
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    createdAt: now()
  });
  if (db.auditLogs.length > 5000) db.auditLogs = db.auditLogs.slice(0, 5000);
  saveDB(db);
}

function nextId(db, type) {
  const id = db.nextId[type]++;
  saveDB(db);
  return id;
}

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/api/login', loginLimiter, (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const db = loadDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    logAudit(req, 'login_failed', 'user', user?.id || null, `Failed login attempt for username: "${username}"`, {
      userId: user?.id || null,
      username: username || 'unknown'
    });
    return res.json({ ok: 0, error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  const sid = createSession(user);
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  res.cookie('sid', sid, {
    httpOnly: true,
    secure: IS_PROD && isHttps,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });
  logAudit(req, 'login', 'user', user.id, 'Login successful', {
    userId: user.id,
    username: user.username
  });
  res.json({ ok: 1, data: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

app.post('/api/logout', (req, res) => {
  const sid = req.cookies?.sid;
  const session = getSession(req);
  logAudit(req, 'logout', 'user', session?.userId || null, 'Logout');
  if (sid) sessions.delete(sid);
  res.clearCookie('sid');
  res.json({ ok: 1 });
});

app.get('/api/me', requireAuth(), (req, res) => {
  res.json({ ok: 1, data: req.session });
});

app.post('/api/me/change-password', requireAuth(), (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 5)
    return res.json({ ok: 0, error: 'Mật khẩu mới phải ít nhất 5 ký tự' });
  const db = loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!verifyPassword(oldPassword, user.passwordHash))
    return res.json({ ok: 0, error: 'Mật khẩu cũ không đúng' });
  user.passwordHash = hashPassword(newPassword);
  saveDB(db);
  logAudit(req, 'update', 'user', user.id, 'Password changed');
  res.json({ ok: 1 });
});

// ─── Users Routes ─────────────────────────────────────────────
app.get('/api/users', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  res.json({ ok: 1, data: db.users.map(u => ({ ...u, passwordHash: undefined })) });
});

app.post('/api/users', requireAuth(['admin']), (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role)
    return res.json({ ok: 0, error: 'Thiếu thông tin' });
  const db = loadDB();
  if (db.users.find(u => u.username === username))
    return res.json({ ok: 0, error: 'Tên đăng nhập đã tồn tại' });
  const user = { id: `u${Date.now()}`, username, name, role, passwordHash: hashPassword(password), createdAt: now() };
  db.users.push(user);
  saveDB(db);
  logAudit(req, 'create', 'user', user.id, user.username);
  res.json({ ok: 1, data: { ...user, passwordHash: undefined } });
});

app.delete('/api/users/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy user' });
  if (db.users[idx].username === 'admin') return res.json({ ok: 0, error: 'Không thể xóa admin' });
  const deletedUser = db.users[idx];
  db.users.splice(idx, 1);
  saveDB(db);
  logAudit(req, 'delete', 'user', deletedUser.id, deletedUser.username);
  res.json({ ok: 1 });
});

app.post('/api/users/:id/reset-password', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const u = db.users.find(u => u.id === req.params.id);
  if (!u) return res.json({ ok: 0, error: 'Không tìm thấy người dùng' });
  
  // Mat khau mac dinh
  const defaultPass = DEFAULT_ADMIN_PASSWORD;
  u.passwordHash = hashPassword(defaultPass);
  saveDB(db);
  logAudit(req, 'reset_password', 'user', u.id, `Reset password for ${u.username}`);
  res.json({ ok: 1 });
});

// ─── Assets Routes ────────────────────────────────────────────
app.get('/api/assets', requireAuth(), (req, res) => {
  const db = loadDB();
  const { q, location, status, category } = req.query;
  let list = db.assets;
  if (q) list = list.filter(a => a.name.toLowerCase().includes(q.toLowerCase()) || a.code?.toLowerCase().includes(q.toLowerCase()));
  if (location) list = list.filter(a => a.location === location);
  if (status) list = list.filter(a => a.status === status);
  if (category) list = list.filter(a => a.category === category);
  res.json({ ok: 1, data: list, total: list.length });
});

app.get('/api/assets/categories', requireAuth(), (req, res) => {
  const db = loadDB();
  const categories = [...new Set(db.assets.map(a => a.category).filter(Boolean))].sort();
  res.json({ ok: 1, data: categories });
});

app.get('/api/assets/:id', requireAuth(), (req, res) => {
  const db = loadDB();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.json({ ok: 0, error: 'Không tìm thấy thiết bị' });
  res.json({ ok: 1, data: asset });
});

app.post('/api/assets', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, code, category, location, manufacturer, model, serialNumber, installDate, notes, status, type, parentId } = req.body;
  if (!name || !location) return res.json({ ok: 0, error: 'Thiếu thông tin bắt buộc' });
  const db = loadDB();
  const id = `A${String(db.nextId.asset).padStart(4, '0')}`;
  db.nextId.asset++;
  const asset = { id, name, code: code || id, type: type || 'equipment', parentId: parentId || null, category, location, manufacturer, model, serialNumber, installDate, notes, status: status || 'active', createdAt: now(), updatedAt: now() };
  db.assets.push(asset);
  saveDB(db);
  logAudit(req, 'create', 'asset', asset.id, asset.name);
  res.json({ ok: 1, data: asset });
});

app.put('/api/assets/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.json({ ok: 0, error: 'Không tìm thấy' });
  Object.assign(asset, req.body, { id: asset.id, updatedAt: now() });
  saveDB(db);
  logAudit(req, 'update', 'asset', asset.id, asset.name);
  res.json({ ok: 1, data: asset });
});

app.delete('/api/assets/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = db.assets.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy' });
  const deletedAsset = db.assets[idx];
  db.assets.splice(idx, 1);
  saveDB(db);
  logAudit(req, 'delete', 'asset', deletedAsset.id, deletedAsset.name);
  res.json({ ok: 1 });
});

// ─── Work Orders Routes ───────────────────────────────────────
app.get('/api/work-orders', requireAuth(), (req, res) => {
  const db = loadDB();
  const { status, priority, assignedTo, assetId, q } = req.query;
  let list = db.workOrders;
  if (status) list = list.filter(w => w.status === status);
  if (priority) list = list.filter(w => w.priority === priority);
  if (assignedTo) list = list.filter(w => w.assignedTo === assignedTo);
  if (assetId) list = list.filter(w => w.assetId === assetId);
  if (q) list = list.filter(w => w.title.toLowerCase().includes(q.toLowerCase()) || w.id.toLowerCase().includes(q.toLowerCase()));
  // Sort: open/in-progress first, then by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const statusOrder = { open: 0, 'in-progress': 1, done: 2, cancelled: 3 };
  list = [...list].sort((a, b) => (statusOrder[a.status] - statusOrder[b.status]) || (priorityOrder[a.priority] - priorityOrder[b.priority]));
  res.json({ ok: 1, data: list, total: list.length });
});

app.get('/api/work-orders/:id', requireAuth(), (req, res) => {
  const db = loadDB();
  const wo = db.workOrders.find(w => w.id === req.params.id);
  if (!wo) return res.json({ ok: 0, error: 'Không tìm thấy lệnh công việc' });
  res.json({ ok: 1, data: wo });
});

app.post('/api/work-orders', requireAuth(['admin', 'manager', 'operator']), (req, res) => {
  const { title, description, assetId, priority, assignedTo, dueDate, type } = req.body;
  if (!title || !priority) return res.json({ ok: 0, error: 'Thiếu tiêu đề hoặc độ ưu tiên' });
  const db = loadDB();
  const id = `WO-${String(db.nextId.workOrder).padStart(4, '0')}`;
  db.nextId.workOrder++;
  const wo = {
    id, title, description, assetId, priority, assignedTo, dueDate,
    type: type || 'corrective',
    status: 'open',
    createdBy: req.session.userId,
    createdAt: now(), updatedAt: now(),
    history: [{ action: 'created', by: req.session.username, at: now() }]
  };
  db.workOrders.push(wo);
  saveDB(db);
  logAudit(req, 'create', 'workOrder', wo.id, wo.title);
  res.json({ ok: 1, data: wo });
});

app.put('/api/work-orders/:id', requireAuth(['admin', 'manager', 'operator']), (req, res) => {
  const db = loadDB();
  const wo = db.workOrders.find(w => w.id === req.params.id);
  if (!wo) return res.json({ ok: 0, error: 'Không tìm thấy' });
  const oldStatus = wo.status;
  Object.assign(wo, req.body, { id: wo.id, createdAt: wo.createdAt, history: wo.history, updatedAt: now() });
  if (req.body.status && req.body.status !== oldStatus) {
    wo.history.push({ action: `status: ${oldStatus} → ${req.body.status}`, by: req.session.username, at: now(), note: req.body.statusNote || '' });
  }
  saveDB(db);
  logAudit(req, 'update', 'workOrder', wo.id, wo.title);
  res.json({ ok: 1, data: wo });
});

app.post('/api/work-orders/:id/comment', requireAuth(), (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ ok: 0, error: 'Thiếu nội dung' });
  const db = loadDB();
  const wo = db.workOrders.find(w => w.id === req.params.id);
  if (!wo) return res.json({ ok: 0, error: 'Không tìm thấy' });
  wo.history.push({ action: 'comment', by: req.session.username, at: now(), note: text });
  wo.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: wo });
});

app.delete('/api/work-orders/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = db.workOrders.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy' });
  db.workOrders.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

// ─── Dashboard Stats ──────────────────────────────────────────
app.get('/api/stats', requireAuth(), (req, res) => {
  const db = loadDB();
  // Inject overdue notifications check
  checkOverdueNotifications(db);
  saveDB(db);
  const wo = db.workOrders;
  const todayStr = now().split('T')[0];
  const pm = db.pmSchedules || [];

  // ─── KPI Calculations ─────────────────────────────
  // MTTR (hours): average time from WO creation to completion
  const doneWOs = wo.filter(w => w.status === 'done' && w.createdAt && w.updatedAt);
  const mttr = doneWOs.length ? Math.round(doneWOs.reduce((sum, w) => {
    return sum + (new Date(w.updatedAt) - new Date(w.createdAt)) / 3600000;
  }, 0) / doneWOs.length * 10) / 10 : 0;

  // MTBF (days): mean time between failure logs
  const failLogs = (db.maintenanceLogs || [])
    .filter(l => (l.results || []).some(r => r.status === 'fail'))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let mtbf = 0;
  if (failLogs.length > 1) {
    let totalDays = 0;
    for (let i = 1; i < failLogs.length; i++) {
      totalDays += (new Date(failLogs[i].createdAt) - new Date(failLogs[i - 1].createdAt)) / 86400000;
    }
    mtbf = Math.round(totalDays / (failLogs.length - 1) * 10) / 10;
  }

  // PM Compliance (%): PMs that generated WOs on time
  const activePMs = pm.filter(p => p.status === 'active');
  const compliantPMs = activePMs.filter(p => p.generatedCount > 0);
  const pmCompliance = activePMs.length ? Math.round(compliantPMs.length / activePMs.length * 100) : 100;

  // WO Overdue Rate (%): overdue WOs vs total open
  const openWOs = wo.filter(w => w.status !== 'done' && w.status !== 'cancelled');
  const overdueWOs = openWOs.filter(w => w.dueDate && w.dueDate < todayStr);
  const overdueRate = openWOs.length ? Math.round(overdueWOs.length / openWOs.length * 100) : 0;

  // Low stock count
  const lowStockCount = (db.inventory || []).filter(i => i.qty <= (i.minQty || 0) && i.minQty > 0).length;
  const pendingTenantReqs = (db.tenantRequests || []).filter(r => r.status === 'pending').length;

  // ─── Trending (last 6 months) ─────────────────────
  const trending = [];
  const nowDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const ym = d.toISOString().slice(0, 7);
    const monthLabel = d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
    trending.push({
      month: ym, label: monthLabel,
      woCreated: wo.filter(w => (w.createdAt || '').startsWith(ym)).length,
      woDone: wo.filter(w => w.status === 'done' && (w.updatedAt || '').startsWith(ym)).length,
      failures: (db.maintenanceLogs || []).filter(l => (l.createdAt || '').startsWith(ym) && (l.results || []).some(r => r.status === 'fail')).length
    });
  }

  res.json({
    ok: 1, data: {
      assets: { total: db.assets.length, active: db.assets.filter(a => a.status === 'active').length },
      workOrders: {
        total: wo.length,
        open: wo.filter(w => w.status === 'open').length,
        inProgress: wo.filter(w => w.status === 'in-progress').length,
        done: wo.filter(w => w.status === 'done').length,
        highPriority: wo.filter(w => w.priority === 'high' && w.status !== 'done').length,
        overdue: overdueWOs.length
      },
      pm: {
        total: activePMs.length,
        overdue: pm.filter(p => p.status === 'active' && p.nextDueDate && p.nextDueDate < todayStr).length,
        dueToday: pm.filter(p => p.status === 'active' && p.nextDueDate === todayStr).length
      },
      kpi: { mttr, mtbf, pmCompliance, overdueRate },
      trending,
      lowStockCount,
      pendingTenantReqs
    }
  });
});

// ─── Checklists Routes ────────────────────────────────────────
app.get('/api/checklists', requireAuth(), (req, res) => {
  const db = loadDB();
  let list = db.checklists || [];
  const { shift, date, limit } = req.query;
  if (shift) list = list.filter(c => c.shift === shift);
  if (date) list = list.filter(c => c.date === date);
  list = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (limit) list = list.slice(0, parseInt(limit));
  res.json({ ok: 1, data: list, total: list.length });
});

app.get('/api/checklists/:id', requireAuth(), (req, res) => {
  const db = loadDB();
  const item = (db.checklists || []).find(c => c.id === req.params.id);
  if (!item) return res.json({ ok: 0, error: 'Không tìm thấy checklist' });
  res.json({ ok: 1, data: item });
});

app.post('/api/checklists', requireAuth(), (req, res) => {
  const db = loadDB();
  if (!db.checklists) db.checklists = [];
  const record = { id: `CL-${Date.now()}`, ...req.body, savedBy: req.session.username, createdAt: now() };
  db.checklists.unshift(record);
  if (db.checklists.length > 500) db.checklists = db.checklists.slice(0, 500);
  saveDB(db);
  res.json({ ok: 1, data: record });
});

// ─── QR Code ──────────────────────────────────────────────────
app.get('/api/assets/:id/qr', requireAuth(), async (req, res) => {
  const db = loadDB();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.json({ ok: 0, error: 'Không tìm thấy thiết bị' });
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `http://${host}/asset/${asset.id}`;
  try {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2, width: 200 });
    res.json({ ok: 1, data: { svg, url, assetId: asset.id, assetName: asset.name } });
  } catch (e) {
    res.json({ ok: 0, error: e.message });
  }
});

// ─── Checklist Templates ──────────────────────────────────────
app.get('/api/checklist-templates', requireAuth(), (req, res) => {
  const db = loadDB();
  const { category } = req.query;
  let list = db.checklistTemplates || [];
  if (category) list = list.filter(t => t.category === category);
  res.json({ ok: 1, data: list });
});

app.post('/api/checklist-templates', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, category, items } = req.body;
  if (!name || !category) return res.json({ ok: 0, error: 'Thiếu tên hoặc danh mục' });
  const db = loadDB();
  const tpl = {
    id: `tpl-${Date.now()}`,
    name, category,
    items: (items || []).map((it, i) => ({ id: i + 1, label: it.label, type: it.type || 'status', unit: it.unit || undefined })),
    createdBy: req.session.username,
    createdAt: now(), updatedAt: now()
  };
  if (!db.checklistTemplates) db.checklistTemplates = [];
  db.checklistTemplates.push(tpl);
  saveDB(db);
  res.json({ ok: 1, data: tpl });
});

app.put('/api/checklist-templates/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const tpl = (db.checklistTemplates || []).find(t => t.id === req.params.id);
  if (!tpl) return res.json({ ok: 0, error: 'Không tìm thấy template' });
  const { name, category, items } = req.body;
  if (name !== undefined) tpl.name = name;
  if (category !== undefined) tpl.category = category;
  if (items !== undefined) tpl.items = items.map((it, i) => ({ id: i + 1, label: it.label, type: it.type || 'status', unit: it.unit || undefined }));
  tpl.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: tpl });
});

app.delete('/api/checklist-templates/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.checklistTemplates || []).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy template' });
  db.checklistTemplates.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

// ─── Maintenance Logs ─────────────────────────────────────────
app.get('/api/maintenance-logs', requireAuth(), (req, res) => {
  const db = loadDB();
  const { assetId, limit } = req.query;
  let list = db.maintenanceLogs || [];
  if (assetId) list = list.filter(l => l.assetId === assetId);
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (limit) list = list.slice(0, parseInt(limit));
  res.json({ ok: 1, data: list, total: list.length });
});

app.post('/api/maintenance-logs', requireAuth(), (req, res) => {
  const db = loadDB();
  if (!db.maintenanceLogs) db.maintenanceLogs = [];
  const log = {
    id: `ML-${Date.now()}`,
    ...req.body,
    submittedBy: req.session.username,
    submittedById: req.session.userId,
    createdAt: now()
  };
  db.maintenanceLogs.unshift(log);
  if (db.maintenanceLogs.length > 1000) db.maintenanceLogs = db.maintenanceLogs.slice(0, 1000);
  saveDB(db);
  res.json({ ok: 1, data: log });
});

// ─── PM Schedule Helpers ──────────────────────────────────────
function calcNextDueDateStr(frequency, fromDateStr) {
  const d = new Date(fromDateStr + 'T00:00:00');
  switch (frequency) {
    case 'daily':     d.setDate(d.getDate() + 1); break;
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setMonth(d.getMonth() + 1); // monthly
  }
  return d.toISOString().split('T')[0];
}

// ─── PM Schedules Routes ──────────────────────────────────────
app.get('/api/pm-schedules', requireAuth(), (req, res) => {
  const db = loadDB();
  const { status, assetId } = req.query;
  let list = db.pmSchedules || [];
  if (status) list = list.filter(p => p.status === status);
  if (assetId) list = list.filter(p => p.assetId === assetId);
  list = [...list].sort((a, b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || ''));
  res.json({ ok: 1, data: list, total: list.length });
});

app.post('/api/pm-schedules/run-due', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const today = now().split('T')[0];
  const generated = [];
  (db.pmSchedules || []).forEach(schedule => {
    if (schedule.status !== 'active') return;
    if (!schedule.nextDueDate || schedule.nextDueDate > today) return;
    if (schedule.lastGeneratedDate === today) return;
    const woId = `WO-${String(db.nextId.workOrder).padStart(4, '0')}`;
    db.nextId.workOrder++;
    db.workOrders.push({
      id: woId,
      title: `[PM] ${schedule.name}`,
      description: `Tự động tạo từ lịch PM: ${schedule.id}${schedule.notes ? '\n' + schedule.notes : ''}`,
      assetId: schedule.assetId || null,
      priority: schedule.priority || 'medium',
      assignedTo: schedule.assignedTo || null,
      dueDate: schedule.nextDueDate,
      type: 'preventive',
      status: 'open',
      pmScheduleId: schedule.id,
      createdBy: 'system',
      createdAt: now(), updatedAt: now(),
      history: [{ action: 'created (PM auto-run)', by: 'system', at: now() }]
    });
    schedule.lastGeneratedDate = today;
    schedule.nextDueDate = calcNextDueDateStr(schedule.frequency, schedule.nextDueDate);
    schedule.generatedCount = (schedule.generatedCount || 0) + 1;
    schedule.updatedAt = now();
    generated.push({ scheduleId: schedule.id, woId });
  });
  saveDB(db);
  res.json({ ok: 1, data: { generated, count: generated.length } });
});

app.post('/api/pm-schedules', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, assetId, templateId, frequency, startDate, assignedTo, priority, notes } = req.body;
  if (!name || !frequency || !startDate) return res.json({ ok: 0, error: 'Thiếu thông tin bắt buộc' });
  const db = loadDB();
  const schedule = {
    id: `PM-${Date.now()}`,
    name, assetId: assetId || null, templateId: templateId || null,
    frequency, startDate,
    assignedTo: assignedTo || null,
    priority: priority || 'medium',
    notes: notes || '',
    status: 'active',
    nextDueDate: startDate,
    lastGeneratedDate: null,
    generatedCount: 0,
    createdBy: req.session.username,
    createdAt: now(), updatedAt: now()
  };
  if (!db.pmSchedules) db.pmSchedules = [];
  db.pmSchedules.push(schedule);
  saveDB(db);
  res.json({ ok: 1, data: schedule });
});

app.put('/api/pm-schedules/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const schedule = (db.pmSchedules || []).find(p => p.id === req.params.id);
  if (!schedule) return res.json({ ok: 0, error: 'Không tìm thấy lịch PM' });
  const { name, assetId, templateId, frequency, startDate, endDate, assignedTo, priority, notes, status } = req.body;
  if (name !== undefined) schedule.name = name;
  if (assetId !== undefined) schedule.assetId = assetId || null;
  if (templateId !== undefined) schedule.templateId = templateId || null;
  if (frequency !== undefined) schedule.frequency = frequency;
  if (startDate !== undefined) {
    if (startDate !== schedule.startDate && schedule.generatedCount === 0) schedule.nextDueDate = startDate;
    schedule.startDate = startDate;
  }
  if (endDate !== undefined) schedule.endDate = endDate || null;
  if (assignedTo !== undefined) schedule.assignedTo = assignedTo || null;
  if (priority !== undefined) schedule.priority = priority;
  if (notes !== undefined) schedule.notes = notes;
  if (status !== undefined) schedule.status = status;
  schedule.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: schedule });
});

app.delete('/api/pm-schedules/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.pmSchedules || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy' });
  db.pmSchedules.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

app.post('/api/pm-schedules/:id/generate-wo', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const schedule = (db.pmSchedules || []).find(p => p.id === req.params.id);
  if (!schedule) return res.json({ ok: 0, error: 'Không tìm thấy lịch PM' });
  const today = now().split('T')[0];
  const woId = `WO-${String(db.nextId.workOrder).padStart(4, '0')}`;
  db.nextId.workOrder++;
  const wo = {
    id: woId,
    title: `[PM] ${schedule.name}`,
    description: `Tạo từ lịch PM: ${schedule.id}${schedule.notes ? '\n' + schedule.notes : ''}`,
    assetId: schedule.assetId || null,
    priority: schedule.priority || 'medium',
    assignedTo: schedule.assignedTo || null,
    dueDate: schedule.nextDueDate,
    type: 'preventive',
    status: 'open',
    pmScheduleId: schedule.id,
    createdBy: req.session.userId,
    createdAt: now(), updatedAt: now(),
    history: [{ action: 'created (PM manual)', by: req.session.username, at: now() }]
  };
  db.workOrders.push(wo);
  schedule.lastGeneratedDate = today;
  schedule.nextDueDate = calcNextDueDateStr(schedule.frequency, schedule.nextDueDate);
  schedule.generatedCount = (schedule.generatedCount || 0) + 1;
  schedule.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: { workOrder: wo, schedule } });
});

// ─── INVENTORY ───────────────────────────────────────────────
app.get('/api/inventory', requireAuth(), (req, res) => {
  const db = loadDB();
  const { search, lowStock } = req.query;
  let list = db.inventory || [];
  if (search) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku||'').toLowerCase().includes(search.toLowerCase()));
  if (lowStock === '1') list = list.filter(i => i.qty <= (i.minQty || 0));
  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ ok: 1, data: list, total: list.length });
});

app.post('/api/inventory', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, sku, unit, qty, minQty, location, notes } = req.body;
  if (!name) return res.json({ ok: 0, error: 'Thieu ten vat tu' });
  const db = loadDB();
  if ((db.inventory||[]).find(i => i.sku && i.sku === sku)) return res.json({ ok: 0, error: 'Ma SKU da ton tai' });
  const item = {
    id: `INV-${Date.now()}`, name, sku: sku||'', unit: unit||'cai',
    qty: Number(qty)||0, minQty: Number(minQty)||0,
    location: location||'', notes: notes||'',
    createdBy: req.session.username, createdAt: now(), updatedAt: now()
  };
  if (!db.inventory) db.inventory = [];
  db.inventory.push(item);
  saveDB(db);
  logAudit(req, 'create', 'inventory', item.id, item.name);
  res.json({ ok: 1, data: item });
});

app.put('/api/inventory/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const item = (db.inventory||[]).find(i => i.id === req.params.id);
  if (!item) return res.json({ ok: 0, error: 'Khong tim thay vat tu' });
  ['name','sku','unit','location','notes'].forEach(f => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
  ['qty','minQty'].forEach(f => { if (req.body[f] !== undefined) item[f] = Number(req.body[f]); });
  item.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: item });
});

app.delete('/api/inventory/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.inventory||[]).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Khong tim thay' });
  db.inventory.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

// Stock transactions (in/out)
app.get('/api/inventory/:id/transactions', requireAuth(), (req, res) => {
  const db = loadDB();
  const list = (db.inventoryTx||[]).filter(t => t.itemId === req.params.id)
    .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,50);
  res.json({ ok: 1, data: list });
});

app.post('/api/inventory/:id/transaction', requireAuth(), (req, res) => {
  const db = loadDB();
  const item = (db.inventory||[]).find(i => i.id === req.params.id);
  if (!item) return res.json({ ok: 0, error: 'Khong tim thay vat tu' });
  const { type, qty, note, workOrderId } = req.body; // type: 'in'|'out'
  if (!type || !qty) return res.json({ ok: 0, error: 'Thieu loai giao dich hoac so luong' });
  const delta = type === 'in' ? Math.abs(Number(qty)) : -Math.abs(Number(qty));
  if (item.qty + delta < 0) return res.json({ ok: 0, error: 'So luong ton kho khong du' });
  item.qty += delta;
  item.updatedAt = now();
  const tx = {
    id: `TX-${Date.now()}`, itemId: item.id, itemName: item.name,
    type, qty: Math.abs(Number(qty)), delta, balanceAfter: item.qty,
    note: note||'', workOrderId: workOrderId||null,
    by: req.session.username, createdAt: now()
  };
  if (!db.inventoryTx) db.inventoryTx = [];
  db.inventoryTx.unshift(tx);
  if (db.inventoryTx.length > 2000) db.inventoryTx = db.inventoryTx.slice(0, 2000);
  // Auto-create low-stock notification
  if (item.qty <= (item.minQty||0) && item.minQty > 0) {
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `NOTIF-${Date.now()}`, type: 'low_stock', read: false,
      title: `Vat tu sap het: ${item.name}`,
      body: `Con lai ${item.qty} ${item.unit}, muc toi thieu: ${item.minQty}`,
      refId: item.id, refType: 'inventory', createdAt: now()
    });
  }
  saveDB(db);
  logAudit(req, type, 'inventory', item.id, `${type === 'in' ? '+' : '-'}${Math.abs(Number(qty))} ${item.unit} ${item.name}`);
  res.json({ ok: 1, data: { tx, item } });
});

// ─── VENDORS ─────────────────────────────────────────────────
app.get('/api/vendors', requireAuth(), (req, res) => {
  const db = loadDB();
  const list = [...(db.vendors || [])].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ ok: 1, data: list, total: list.length });
});

app.post('/api/vendors', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, contact, phone, email, address, notes } = req.body;
  if (!name) return res.json({ ok: 0, error: 'Thiếu tên nhà cung cấp' });
  const db = loadDB();
  const vendor = {
    id: `VND-${Date.now()}`, name, contact: contact || '', phone: phone || '',
    email: email || '', address: address || '', notes: notes || '',
    createdBy: req.session.username, createdAt: now(), updatedAt: now()
  };
  db.vendors.push(vendor);
  saveDB(db);
  logAudit(req, 'create', 'vendor', vendor.id, vendor.name);
  res.json({ ok: 1, data: vendor });
});

app.put('/api/vendors/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const vendor = (db.vendors || []).find(v => v.id === req.params.id);
  if (!vendor) return res.json({ ok: 0, error: 'Không tìm thấy nhà cung cấp' });
  ['name', 'contact', 'phone', 'email', 'address', 'notes'].forEach(f => {
    if (req.body[f] !== undefined) vendor[f] = req.body[f];
  });
  vendor.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: vendor });
});

app.delete('/api/vendors/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.vendors || []).findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy' });
  db.vendors.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

// ─── PURCHASE ORDERS ─────────────────────────────────────────
app.get('/api/purchase-orders', requireAuth(), (req, res) => {
  const db = loadDB();
  const { status } = req.query;
  let list = db.purchaseOrders || [];
  if (status) list = list.filter(po => po.status === status);
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: 1, data: list, total: list.length });
});

app.post('/api/purchase-orders', requireAuth(['admin', 'manager']), (req, res) => {
  const { vendorId, vendorName, items, notes, expectedDate } = req.body;
  if (!vendorId || !items || !items.length) return res.json({ ok: 0, error: 'Thiếu nhà cung cấp hoặc danh sách hàng' });
  const db = loadDB();
  const totalAmount = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const po = {
    id: `PO-${Date.now()}`, vendorId, vendorName: vendorName || vendorId,
    items: items.map(i => ({ name: i.name, sku: i.sku || '', qty: Number(i.qty) || 1, unit: i.unit || 'cái', unitPrice: Number(i.unitPrice) || 0 })),
    totalAmount, notes: notes || '', status: 'draft',
    expectedDate: expectedDate || null,
    createdBy: req.session.username, createdAt: now(), updatedAt: now()
  };
  db.purchaseOrders.push(po);
  saveDB(db);
  logAudit(req, 'create', 'purchaseOrder', po.id, `${po.vendorName} - ${po.totalAmount.toLocaleString()}đ`);
  res.json({ ok: 1, data: po });
});

app.put('/api/purchase-orders/:id/status', requireAuth(['admin', 'manager']), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'sent', 'received', 'cancelled'];
  if (!validStatuses.includes(status)) return res.json({ ok: 0, error: 'Trạng thái không hợp lệ' });
  const db = loadDB();
  const po = (db.purchaseOrders || []).find(p => p.id === req.params.id);
  if (!po) return res.json({ ok: 0, error: 'Không tìm thấy đơn mua hàng' });
  po.status = status;
  po.updatedAt = now();
  if (status === 'received') {
    po.receivedAt = now();
    po.receivedBy = req.session.username;
    // Update inventory stock by matching SKU or Name
    (po.items || []).forEach(item => {
      const invItem = (db.inventory || []).find(i =>
        (item.sku && i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) ||
        i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (invItem) {
        invItem.qty += Number(item.qty) || 0;
        invItem.updatedAt = now();
        if (!db.inventoryTx) db.inventoryTx = [];
        db.inventoryTx.unshift({
          id: `TX-${Date.now()}-${invItem.id}`, itemId: invItem.id, itemName: invItem.name,
          type: 'in', qty: Number(item.qty), delta: Number(item.qty), balanceAfter: invItem.qty,
          note: `Nhập từ PO: ${po.id}`, workOrderId: null,
          by: req.session.username, createdAt: now()
        });
      }
    });
    if (db.inventoryTx && db.inventoryTx.length > 2000) db.inventoryTx = db.inventoryTx.slice(0, 2000);
  }
  saveDB(db);
  logAudit(req, 'update_status', 'purchaseOrder', po.id, `${po.vendorName} → ${status}`);
  res.json({ ok: 1, data: po });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────
app.get('/api/notifications', requireAuth(['admin','manager']), (req, res) => {
  const db = loadDB();
  const list = (db.notifications||[]).slice(0, 30);
  const unread = list.filter(n => !n.read).length;
  res.json({ ok: 1, data: list, unread });
});

app.post('/api/notifications/mark-read', requireAuth(['admin','manager']), (req, res) => {
  const db = loadDB();
  (db.notifications||[]).forEach(n => n.read = true);
  saveDB(db);
  res.json({ ok: 1 });
});

// Auto-notify overdue WOs (called on /api/stats fetch)
function checkOverdueNotifications(db) {
  const today = now().split('T')[0];
  const existing = new Set((db.notifications||[]).filter(n=>n.type==='overdue_wo').map(n=>n.refId));
  (db.workOrders||[]).forEach(wo => {
    if (wo.status === 'done' || wo.status === 'cancelled') return;
    if (!wo.dueDate || wo.dueDate >= today) return;
    if (existing.has(wo.id)) return;
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: `NOTIF-${Date.now()}-${wo.id}`, type: 'overdue_wo', read: false,
      title: `Lenh cong viec qua han: ${wo.title}`,
      body: `Ma: ${wo.id} - Han: ${wo.dueDate}`,
      refId: wo.id, refType: 'workOrder', createdAt: now()
    });
  });
  if (db.notifications && db.notifications.length > 200) db.notifications = db.notifications.slice(0,200);
}

// ─── TENANT PORTAL ────────────────────────────────────────────
app.get('/tenant', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tenant.html')));

app.post('/api/tenant-requests', (req, res) => {
  const { name, phone, unit: tenantUnit, category, description, urgency } = req.body;
  if (!name || !description) return res.json({ ok: 0, error: 'Vui long nhap ten va mo ta su co' });
  const db = loadDB();
  const token = crypto.randomBytes(8).toString('hex');
  const request = {
    id: `TR-${Date.now()}`, token, name, phone: phone||'', unit: tenantUnit||'',
    category: category||'Khac', description, urgency: urgency||'normal',
    status: 'pending', workOrderId: null,
    createdAt: now(), updatedAt: now()
  };
  if (!db.tenantRequests) db.tenantRequests = [];
  db.tenantRequests.unshift(request);
  // Auto create notification for managers
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `NOTIF-${Date.now()}`, type: 'tenant_request', read: false,
    title: `Yeu cau moi tu cu dan: ${name}`,
    body: `[${request.category}] ${description.slice(0,80)}`,
    refId: request.id, refType: 'tenantRequest', createdAt: now()
  });
  saveDB(db);
  res.json({ ok: 1, data: { id: request.id, token } });
});

app.get('/api/tenant-requests/track/:token', (req, res) => {
  const db = loadDB();
  const req2 = (db.tenantRequests||[]).find(r => r.token === req.params.token);
  if (!req2) return res.json({ ok: 0, error: 'Khong tim thay yeu cau' });
  res.json({ ok: 1, data: { id: req2.id, status: req2.status, category: req2.category, description: req2.description, createdAt: req2.createdAt, workOrderId: req2.workOrderId } });
});

app.get('/api/tenant-requests', requireAuth(['admin','manager']), (req, res) => {
  const db = loadDB();
  const list = (db.tenantRequests||[]).slice(0, 100);
  res.json({ ok: 1, data: list, total: list.length });
});

app.put('/api/tenant-requests/:id/approve', requireAuth(['admin','manager']), (req, res) => {
  const db = loadDB();
  const tr = (db.tenantRequests||[]).find(r => r.id === req.params.id);
  if (!tr) return res.json({ ok: 0, error: 'Khong tim thay yeu cau' });
  const woId = `WO-${String(db.nextId.workOrder).padStart(4,'0')}`;
  db.nextId.workOrder++;
  const wo = {
    id: woId, title: `[Tenant] ${tr.category} - Can ho ${tr.unit||'?'}`,
    description: `${tr.description}\n\nYeu cau tu: ${tr.name} - ${tr.phone||''}`,
    priority: tr.urgency === 'urgent' ? 'high' : 'medium',
    status: 'open', type: 'corrective',
    createdBy: 'tenant-portal', tenantRequestId: tr.id,
    createdAt: now(), updatedAt: now(),
    history: [{ action: 'created from tenant request', by: req.session.username, at: now() }]
  };
  db.workOrders.push(wo);
  tr.status = 'approved'; tr.workOrderId = woId; tr.updatedAt = now();
  saveDB(db);
  logAudit(req, 'approve', 'tenantRequest', tr.id, `${tr.category} - ${tr.name}`);
  res.json({ ok: 1, data: { workOrder: wo, tenantRequest: tr } });
});

app.put('/api/tenant-requests/:id/reject', requireAuth(['admin','manager']), (req, res) => {
  const db = loadDB();
  const tr = (db.tenantRequests||[]).find(r => r.id === req.params.id);
  if (!tr) return res.json({ ok: 0, error: 'Khong tim thay' });
  tr.status = 'rejected'; tr.updatedAt = now();
  saveDB(db);
  logAudit(req, 'reject', 'tenantRequest', tr.id, `${tr.category} - ${tr.name}`);
  res.json({ ok: 1 });
});

// ─── Shifts / HR ─────────────────────────────────────────────
const SHIFT_DEFAULTS = { morning: { start: '06:00', end: '14:00' }, afternoon: { start: '14:00', end: '22:00' }, night: { start: '22:00', end: '06:00' } };

app.get('/api/shifts/workload', requireAuth(), (req, res) => {
  const db = loadDB();
  const month = req.query.month || now().slice(0, 7);
  const shifts = (db.shifts || []).filter(s => s.date && s.date.startsWith(month));
  const users = db.users.filter(u => u.role === 'operator');
  const result = users.map(u => {
    const uShifts = shifts.filter(s => s.userId === u.id);
    let totalHours = 0;
    uShifts.forEach(s => {
      if (s.checkInAt && s.checkOutAt) {
        totalHours += (new Date(s.checkOutAt) - new Date(s.checkInAt)) / 3600000;
      } else {
        totalHours += 8;
      }
    });
    const wos = (db.workOrders || []).filter(w => w.assignedTo === u.id || w.assignedTo === u.username);
    return {
      userId: u.id, userName: u.name || u.username,
      totalShifts: uShifts.length,
      totalHours: Math.round(totalHours * 10) / 10,
      activeWOs: wos.filter(w => w.status !== 'done' && w.status !== 'cancelled').length,
      completedWOs: wos.filter(w => w.status === 'done').length
    };
  });
  res.json({ ok: 1, data: result });
});

app.get('/api/shifts', requireAuth(), (req, res) => {
  const db = loadDB();
  const { from, to, userId } = req.query;
  let list = db.shifts || [];
  if (from) list = list.filter(s => s.date >= from);
  if (to) list = list.filter(s => s.date <= to);
  if (userId) list = list.filter(s => s.userId === userId);
  list = [...list].sort((a, b) => a.date.localeCompare(b.date));
  res.json({ ok: 1, data: list });
});

app.post('/api/shifts', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const { userId, userName, date, shiftType, notes } = req.body;
  if (!userId || !date || !shiftType) return res.json({ ok: 0, error: 'Thiếu thông tin bắt buộc' });
  const def = SHIFT_DEFAULTS[shiftType] || SHIFT_DEFAULTS.morning;
  const shift = {
    id: `SH-${Date.now()}`, userId, userName: userName || userId,
    date, shiftType, startTime: def.start, endTime: def.end,
    notes: notes || '', status: 'scheduled',
    checkInAt: null, checkOutAt: null,
    createdBy: req.session.username, createdAt: now()
  };
  db.shifts.push(shift);
  saveDB(db);
  res.json({ ok: 1, data: shift });
});

app.put('/api/shifts/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const shift = (db.shifts || []).find(s => s.id === req.params.id);
  if (!shift) return res.json({ ok: 0, error: 'Không tìm thấy ca' });
  const { userId, userName, date, shiftType, notes } = req.body;
  if (userId) shift.userId = userId;
  if (userName) shift.userName = userName;
  if (date) shift.date = date;
  if (shiftType) { shift.shiftType = shiftType; const def = SHIFT_DEFAULTS[shiftType] || {}; shift.startTime = def.start; shift.endTime = def.end; }
  if (notes !== undefined) shift.notes = notes;
  shift.updatedAt = now();
  saveDB(db);
  res.json({ ok: 1, data: shift });
});

app.delete('/api/shifts/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.shifts || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy ca' });
  db.shifts.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

app.post('/api/shifts/:id/check-in', requireAuth(), (req, res) => {
  const db = loadDB();
  const shift = (db.shifts || []).find(s => s.id === req.params.id);
  if (!shift) return res.json({ ok: 0, error: 'Không tìm thấy ca' });
  const session = getSession(req);
  if (session.role === 'operator' && shift.userId !== session.id) return res.json({ ok: 0, error: 'Không có quyền' });
  shift.checkInAt = now();
  shift.status = 'checked-in';
  saveDB(db);
  res.json({ ok: 1, data: shift });
});

app.post('/api/shifts/:id/check-out', requireAuth(), (req, res) => {
  const db = loadDB();
  const shift = (db.shifts || []).find(s => s.id === req.params.id);
  if (!shift) return res.json({ ok: 0, error: 'Không tìm thấy ca' });
  const session = getSession(req);
  if (session.role === 'operator' && shift.userId !== session.id) return res.json({ ok: 0, error: 'Không có quyền' });
  shift.checkOutAt = now();
  shift.status = 'checked-out';
  saveDB(db);
  res.json({ ok: 1, data: shift });
});

// ─── Audit Logs ───────────────────────────────────────────────
app.get('/api/audit-logs', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  let list = db.auditLogs || [];
  const { entity, action, userId, limit } = req.query;
  if (entity) list = list.filter(l => l.entity === entity);
  if (action) list = list.filter(l => l.action === action);
  if (userId) list = list.filter(l => l.userId === userId);
  list = list.slice(0, Number(limit) || 50);
  res.json({ ok: 1, data: list, total: (db.auditLogs || []).length });
});

// ─── Export DB ────────────────────────────────────────────────
app.get('/api/export/db', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const safe = JSON.parse(JSON.stringify(db));
  (safe.users || []).forEach(u => delete u.passwordHash);
  res.setHeader('Content-Disposition', `attachment; filename=cmms-export-${now().split('T')[0]}.json`);
  logAudit(req, 'export', 'system', null, 'Full DB export');
  res.json(safe);
});

// ─── Backup ───────────────────────────────────────────────────
app.post('/api/backup', requireAuth(['admin']), (req, res) => {
  const backupDir = path.join(__dirname, 'data', 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const filename = `db_${now().split('T')[0]}_${Date.now()}.json`;
  const db = loadDB();
  fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(db, null, 2));
  logAudit(req, 'create', 'backup', filename, 'Manual backup created');
  res.json({ ok: 1, data: { filename } });
});

// ─── API Key auth middleware ──────────────────────────────────
function validateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ ok: 0, error: 'Thiếu x-api-key' });
  const db = loadDB();
  const record = (db.apiKeys || []).find(k => k.key === key && k.active);
  if (!record) return res.status(403).json({ ok: 0, error: 'API key không hợp lệ hoặc đã bị thu hồi' });
  req.apiKeyRecord = record;
  next();
}

// ─── Integration – API Keys ───────────────────────────────────
app.get('/api/integration/api-keys', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const safe = (db.apiKeys || []).map(k => ({ ...k, key: k.key.slice(0, 8) + '••••••••' }));
  res.json({ ok: 1, data: safe });
});

app.post('/api/integration/api-keys', requireAuth(['admin']), (req, res) => {
  const { label } = req.body;
  if (!label) return res.json({ ok: 0, error: 'Thiếu nhãn (label)' });
  const db = loadDB();
  const key = crypto.randomBytes(32).toString('hex');
  const record = { id: `KEY-${Date.now()}`, label, key, active: true, createdAt: now() };
  db.apiKeys.push(record);
  saveDB(db);
  logAudit(req, 'create', 'apiKey', record.id, `Tạo API key: ${label}`);
  res.json({ ok: 1, data: { ...record } });
});

app.delete('/api/integration/api-keys/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.apiKeys || []).findIndex(k => k.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy key' });
  db.apiKeys[idx].active = false;
  saveDB(db);
  logAudit(req, 'revoke', 'apiKey', req.params.id, 'Thu hồi API key');
  res.json({ ok: 1 });
});

// ─── Integration – Webhooks ───────────────────────────────────
app.get('/api/integration/webhooks', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  res.json({ ok: 1, data: db.webhooks || [] });
});

app.post('/api/integration/webhooks', requireAuth(['admin']), (req, res) => {
  const { url, events, label } = req.body;
  if (!url || !events || !events.length) return res.json({ ok: 0, error: 'Thiếu URL hoặc events' });
  try { new URL(url); } catch { return res.json({ ok: 0, error: 'URL không hợp lệ' }); }
  const db = loadDB();
  const wh = { id: `WH-${Date.now()}`, label: label || url, url, events, active: true, createdAt: now() };
  db.webhooks.push(wh);
  saveDB(db);
  logAudit(req, 'create', 'webhook', wh.id, `Đăng ký webhook: ${url}`);
  res.json({ ok: 1, data: wh });
});

app.delete('/api/integration/webhooks/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = (db.webhooks || []).findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy webhook' });
  db.webhooks.splice(idx, 1);
  saveDB(db);
  logAudit(req, 'delete', 'webhook', req.params.id, 'Xóa webhook');
  res.json({ ok: 1 });
});

// ─── External Alert (BMS/IoT) ─────────────────────────────────
app.post('/api/external/alert', validateApiKey, (req, res) => {
  const { assetId, faultCode, description, severity } = req.body;
  if (!faultCode || !description) return res.json({ ok: 0, error: 'Thiếu faultCode hoặc description' });
  const priorityMap = { critical: 'high', warning: 'medium', info: 'low' };
  const priority = priorityMap[severity] || 'medium';
  const db = loadDB();
  const woId = `WO-${String(db.nextId.workOrder).padStart(4, '0')}`;
  db.nextId.workOrder++;
  const wo = {
    id: woId,
    title: `[BMS] ${faultCode} — ${assetId || 'Không rõ thiết bị'}`,
    description: `Cảnh báo tự động từ BMS/IoT.\nMã lỗi: ${faultCode}\nMức độ: ${severity || 'warning'}\nMô tả: ${description}`,
    type: 'emergency',
    priority,
    status: 'open',
    assetId: assetId || null,
    assignedTo: null,
    dueDate: null,
    source: 'bms',
    apiKeyId: req.apiKeyRecord.id,
    history: [{ by: 'system', action: 'created', note: `Auto-generated by BMS alert (key: ${req.apiKeyRecord.label})`, at: now() }],
    createdAt: now(),
    updatedAt: now()
  };
  db.workOrders.push(wo);
  // Fire-and-forget webhook dispatch for work_order.created
  const activeWebhooks = (db.webhooks || []).filter(w => w.active && w.events.includes('work_order.created'));
  saveDB(db);
  const payload = JSON.stringify({ event: 'work_order.created', data: wo, ts: now() });
  activeWebhooks.forEach(wh => {
    const u = new URL(wh.url);
    const mod = u.protocol === 'https:' ? require('https') : require('http');
    const opts = { hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'X-CMMS-Event': 'work_order.created' } };
    const r2 = mod.request(opts);
    r2.on('error', () => {});
    r2.write(payload);
    r2.end();
  });
  res.json({ ok: 1, data: { workOrderId: woId, priority } });
});

// ─── Health check ─────────────────────────────────────────────
// ─── System / Release Management ──────────────────────────────
const APP_VERSION = '1.3.5'; // Sẽ tự động tăng khi deploy

app.get('/api/system/info', requireAuth(), (req, res) => {
  res.json({
    ok: 1,
    data: {
      version: APP_VERSION,
      env: process.env.NODE_ENV || 'development',
      node: process.version,
      uptime: process.uptime()
    }
  });
});

app.get('/api/system/tasks', requireAuth(['admin']), (req, res) => {
  const doneDir = path.join(__dirname, 'brain', 'tasks_done');
  const queueDir = path.join(__dirname, 'brain', 'tasks_queue');
  
  const getTasks = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.txt'))
      .map(f => {
        const stats = fs.statSync(path.join(dir, f));
        return { name: f, time: stats.mtime, size: stats.size };
      })
      .sort((a, b) => b.time - a.time);
  };

  res.json({
    ok: 1,
    data: {
      done: getTasks(doneDir),
      queue: getTasks(queueDir)
    }
  });
});

// Promotion API (Test -> Stable)
app.post('/api/system/promote', requireAuth(['admin']), (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({ ok: 0, error: 'Chỉ có thể kích hoạt phát hành từ môi trường TEST' });
  }

  const { exec } = require('child_process');
  console.log(`[PROMOTE] Admin ${req.session.username} initiated promotion to STABLE.`);
  
  // Docker command to rebuild stable
  const cmd = 'docker-compose -f deploy/docker-compose.yml up -d --build cmms-stable';
  
  exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('Promotion failed:', err);
      return res.json({ ok: 0, error: 'Lỗi phát hành: ' + err.message });
    }
    logAudit(req, 'promote', 'system', 'all', `Promoted Test to Stable (v${APP_VERSION})`);
    res.json({ ok: 1, message: 'Đã kích hoạt phát hành bản Stable thành công!' });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: now(), 
    version: APP_VERSION,
    env: process.env.NODE_ENV || 'development'
  });
});

// ─── SPA fallback ─────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── Start ────────────────────────────────────────────────────
if (!fs.existsSync(DB_PATH)) initDB();
app.listen(PORT, () => console.log(`CMMS running at http://localhost:${PORT}`));
