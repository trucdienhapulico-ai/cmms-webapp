# CMMS System Health Report
**Date:** 2026-05-04  
**Branch:** task/go-live-security  
**Auditor:** Claude (Issue #26)

---

## 1. API Verification Results — ✅ PASS

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/health` | ✅ OK | uptime confirmed |
| `POST /api/login` | ✅ OK | Admin password was already reset to secure default (`DNHc4&982!cjhDB`) |
| `GET /api/stats` | ✅ OK | No NaN values. KPI: MTTR=0h, MTBF=0d, PM Compliance=100%, Overdue=11% |
| `GET /api/work-orders` | ✅ OK | 9 WOs returned, sorted correctly |
| `GET /api/inventory` | ✅ OK | 0 items (not yet populated) |
| `GET /api/system/info` | ✅ OK | v1.3.5, development |

**KPI Snapshot (2026-05-04):**
- Total Assets: 25 (10 active, 3 inactive/maintenance, 12 inactive LK pumps)
- Work Orders: 9 total (7 open, 2 in-progress, 0 done)
- Overdue WOs: 1 (`WO-0001` — Bom nuoc B1, due 2026-05-03)
- High Priority open: 2
- PM Schedules: 0 active
- Inventory: 0 items

---

## 2. UI Map Audit — ✅ PASS

`renderUIMap()` contains 29 UI component entries covering all navigable pages. All clipboard buttons use `navigator.clipboard.writeText()` and `toast()` which are available globally. No broken links or missing code references found.

All navigation routes are mapped:
- Sidebar nav → `navigate()` → `renders{}` → correct render functions ✅
- Bottom nav (mobile) → same route IDs ✅
- Admin-only menu items hidden via `id="admin-menu" style="display:none"` until login ✅

**Minor UI fix applied:** Added `integration: 'Kết nối BMS/IoT'` to the page titles map (was showing raw key "integration" as page title).

---

## 3. Bug Hunting — 5 Bugs Fixed

### Bug 1 — CRITICAL: `req.user` crash in promote endpoint
- **File:** `server.js:1386`
- **Issue:** Used `req.user.username` but the auth middleware populates `req.session`, not `req.user`. Would crash `POST /api/system/promote` with a TypeError.
- **Fix:** Changed to `req.session.username` ✅

### Bug 2 — `/api/meta` endpoint missing
- **File:** `index.html:697` in `showApp()`
- **Issue:** Called `api('GET', '/api/meta')` which doesn't exist. The correct endpoint is `/api/system/info`. Silent console error on every login.
- **Fix:** Changed to `/api/system/info` with proper `meta.data` access ✅

### Bug 3 — Missing page title for Integration screen
- **File:** `index.html:724` in `navigate()` titles map
- **Issue:** `integration` page key was absent from the titles map. Navigating to the BMS/IoT integration screen showed "integration" as the page title instead of a readable label.
- **Fix:** Added `integration: 'Kết nối BMS/IoT'` ✅

### Bug 4 — Dashboard crash on API failure
- **File:** `index.html:1237` in `renderDashboard()`
- **Issue:** If `/api/stats` returned a non-ok response (e.g., session expired), the function immediately accessed `r.data.pm` without null checking, throwing `TypeError: Cannot read properties of undefined`.
- **Fix:** Added guard: if `!r.ok || !r.data` → render error state and return ✅

### Bug 5 — SECURITY: Plaintext password stored in localStorage
- **File:** `index.html:643–651` in `doLogin()` and `loadSavedCredentials()`
- **Issue:** The "Remember Me" feature stored the plaintext password in `localStorage['cmms-p']`. Any JS code (including XSS) could read it.
- **Fix:** Removed all password read/write from localStorage. "Remember Me" now only saves the username. Existing `cmms-p` keys are purged on load. ✅

---

## 4. Data Cleanup

### Orphaned Records — ✅ NONE FOUND
- All WOs with a non-null `assetId` point to valid assets.
- No orphaned PM schedules.

### Data Quality Fix Applied
- 5 OPS-imported WOs (`WO-0005` through `WO-0009`) had `assignedTo: ""` instead of `null`.
- Fixed: all set to `null`. UI already handled this gracefully (`w.assignedTo || '—'`), but cleaned for consistency.

### Attention Required
- `WO-0001` (Bom nuoc B1 — van ro) is **OVERDUE** since 2026-05-03. Assign and complete.
- `WO-0003` (MCB tang 5 trip) has no `dueDate`. Consider adding one.
- Inventory module has 0 items — needs to be populated before go-live.
- 22 OPS-imported assets have empty `manufacturer`, `model`, `installDate` fields.

---

## 5. Go-Live Security Checklist

| Item | Status |
|---|---|
| Plaintext password in localStorage | ✅ Fixed |
| Admin password changed from default `admin123` | ✅ Already changed |
| Cookie: `httpOnly`, `secure` (prod), `sameSite: strict` | ✅ |
| Rate limiting on `/api/` (200 req/15min) | ✅ |
| HTTPS redirect in production | ✅ |
| Security headers (HSTS, X-Frame-Options, etc.) | ✅ |
| PBKDF2+SHA256 password hashing | ✅ |
| `req.user` crash in promote endpoint | ✅ Fixed |
| XSS: user-controlled data rendered into innerHTML | ⚠️ WO titles and descriptions inserted raw into HTML — consider sanitization before go-live |

---

## Overall Health: 🟡 READY WITH CAUTION

5 bugs fixed. 1 overdue WO needs attention. Inventory needs population. Raw HTML insertion from user data warrants a sanitization review before go-live.
