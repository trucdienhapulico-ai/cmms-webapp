'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = 3090;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB helpers ──────────────────────────────────────────────
function loadDB() {
  if (!fs.existsSync(DB_PATH)) initDB();
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!db.checklists) { db.checklists = []; saveDB(db); }
  if (!db.checklistTemplates || db.checklistTemplates.length === 0) { db.checklistTemplates = getDefaultTemplates(); saveDB(db); }
  if (!db.maintenanceLogs) { db.maintenanceLogs = []; saveDB(db); }
  return db;
}
function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function initDB() {
  const db = {
    users: [{
      id: 'u1', username: 'admin', role: 'admin',
      passwordHash: hashPassword('admin123'),
      name: 'Administrator', createdAt: now()
    }],
    assets: [],
    workOrders: [],
    checklists: [],
    checklistTemplates: getDefaultTemplates(),
    maintenanceLogs: [],
    nextId: { asset: 1, workOrder: 1 }
  };
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
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
function nextId(db, type) {
  const id = db.nextId[type]++;
  saveDB(db);
  return id;
}

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash))
    return res.json({ ok: 0, error: 'Sai tên đăng nhập hoặc mật khẩu' });
  const sid = createSession(user);
  res.cookie('sid', sid, { httpOnly: true, maxAge: 86400000 * 7 });
  res.json({ ok: 1, data: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

app.post('/api/logout', (req, res) => {
  const sid = req.cookies?.sid;
  if (sid) sessions.delete(sid);
  res.clearCookie('sid');
  res.json({ ok: 1 });
});

app.get('/api/me', requireAuth(), (req, res) => {
  res.json({ ok: 1, data: req.session });
});

app.post('/api/me/change-password', requireAuth(), (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.json({ ok: 0, error: 'Mật khẩu mới phải ít nhất 6 ký tự' });
  const db = loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!verifyPassword(oldPassword, user.passwordHash))
    return res.json({ ok: 0, error: 'Mật khẩu cũ không đúng' });
  user.passwordHash = hashPassword(newPassword);
  saveDB(db);
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
  res.json({ ok: 1, data: { ...user, passwordHash: undefined } });
});

app.delete('/api/users/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy user' });
  if (db.users[idx].username === 'admin') return res.json({ ok: 0, error: 'Không thể xóa admin' });
  db.users.splice(idx, 1);
  saveDB(db);
  res.json({ ok: 1 });
});

// ─── Assets Routes ────────────────────────────────────────────
app.get('/api/assets', requireAuth(), (req, res) => {
  const db = loadDB();
  const { q, location, status } = req.query;
  let list = db.assets;
  if (q) list = list.filter(a => a.name.toLowerCase().includes(q.toLowerCase()) || a.code?.toLowerCase().includes(q.toLowerCase()));
  if (location) list = list.filter(a => a.location === location);
  if (status) list = list.filter(a => a.status === status);
  res.json({ ok: 1, data: list, total: list.length });
});

app.get('/api/assets/:id', requireAuth(), (req, res) => {
  const db = loadDB();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.json({ ok: 0, error: 'Không tìm thấy thiết bị' });
  res.json({ ok: 1, data: asset });
});

app.post('/api/assets', requireAuth(['admin', 'manager']), (req, res) => {
  const { name, code, category, location, manufacturer, model, serialNumber, installDate, notes, status } = req.body;
  if (!name || !category || !location) return res.json({ ok: 0, error: 'Thiếu thông tin bắt buộc' });
  const db = loadDB();
  const id = `A${String(db.nextId.asset).padStart(4, '0')}`;
  db.nextId.asset++;
  const asset = { id, name, code: code || id, category, location, manufacturer, model, serialNumber, installDate, notes, status: status || 'active', createdAt: now(), updatedAt: now() };
  db.assets.push(asset);
  saveDB(db);
  res.json({ ok: 1, data: asset });
});

app.put('/api/assets/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const db = loadDB();
  const asset = db.assets.find(a => a.id === req.params.id);
  if (!asset) return res.json({ ok: 0, error: 'Không tìm thấy' });
  Object.assign(asset, req.body, { id: asset.id, updatedAt: now() });
  saveDB(db);
  res.json({ ok: 1, data: asset });
});

app.delete('/api/assets/:id', requireAuth(['admin']), (req, res) => {
  const db = loadDB();
  const idx = db.assets.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.json({ ok: 0, error: 'Không tìm thấy' });
  db.assets.splice(idx, 1);
  saveDB(db);
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
  const wo = db.workOrders;
  res.json({
    ok: 1, data: {
      assets: { total: db.assets.length, active: db.assets.filter(a => a.status === 'active').length },
      workOrders: {
        total: wo.length,
        open: wo.filter(w => w.status === 'open').length,
        inProgress: wo.filter(w => w.status === 'in-progress').length,
        done: wo.filter(w => w.status === 'done').length,
        highPriority: wo.filter(w => w.priority === 'high' && w.status !== 'done').length,
        overdue: wo.filter(w => w.dueDate && w.status !== 'done' && new Date(w.dueDate) < new Date()).length
      }
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

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: 1, uptime: process.uptime() }));

// ─── SPA fallback ─────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── Start ────────────────────────────────────────────────────
if (!fs.existsSync(DB_PATH)) initDB();
app.listen(PORT, () => console.log(`CMMS running at http://localhost:${PORT}`));
