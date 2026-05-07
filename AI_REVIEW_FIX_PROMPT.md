# CMMS WebApp Review Report and Fix Prompt

Date: 2026-05-06  
Repository: https://github.com/trucdienhapulico-ai/cmms-webapp  
Local checkout reviewed: `C:\Users\trucd\OneDrive\Documents\New project\cmms-webapp`  
Latest local commit observed: `186b09e Security: Lower min password length to 5 and update admin password to 'admin'`

## Purpose

Use this file as both:

1. A concise security/quality review report.
2. A ready-to-paste implementation prompt for another AI/software engineer to fix the issues.

The highest-risk items are secret exposure, committed runtime data, stored XSS, and weak bootstrap authentication. Treat these as production-blocking before exposing the app to the public internet.

## Verification Already Performed

The app was cloned and inspected locally. These checks passed:

```powershell
node --check server.js
npm audit --omit=dev
```

The app also started locally and returned a healthy response:

```powershell
GET http://localhost:3090/api/health
```

Observed response shape:

```json
{"status":"ok","version":"1.3.5","env":"development"}
```

`npm ci --omit=dev --ignore-scripts` completed successfully, but npm warned that `multer@1.x` is deprecated and should be upgraded to `2.x` when practical.

## Executive Summary

The project is a useful internal CMMS MVP with:

- Node.js + Express backend.
- Vanilla JS frontend.
- JSON-file persistence.
- Auth, role checks, audit log, backup/export, tenant portal, BMS/API-key integration.
- Docker Compose deployment for Synology NAS.
- Responsive screenshots and some operational documentation.

Main concerns:

- Public repo includes hardcoded infrastructure secrets.
- Public repo includes backup/runtime data with user password hashes.
- Frontend renders user-controlled data via `innerHTML` without escaping.
- New DBs bootstrap `admin/admin`.
- Operator shift check-in/check-out permission logic uses the wrong session property.
- JSON DB writes are non-atomic.
- Large single files make future review and regression prevention harder.

## Findings

### Finding 1: P0 - Secret committed to public repo

Files observed:

- `deploy.js`
- `check_nas.js`
- `push-docker-compose.js`
- `deploy/scripts/deploy-to-nas.js`
- `test-ssh.js`
- `test-ssh-logs.js`
- `deploy/docker-compose.yml`
- several `scratch/*.js` files

Issue:

Hardcoded SSH/sudo credentials and a Cloudflare tunnel token are present in tracked files. Because the repo is public, these secrets must be treated as compromised.

Required action:

- Rotate/revoke the exposed secrets outside the codebase.
- Remove secrets from tracked files.
- Replace with environment variables or a secret store.
- Do not print actual secret values in logs or docs.
- Consider removing secrets from git history using `git filter-repo` or BFG, then force-push only after coordinating with the owner.

Suggested environment variables:

```text
NAS_HOST
NAS_PORT
NAS_USER
NAS_PASSWORD
CLOUDFLARE_TUNNEL_TOKEN
ADMIN_RESET_PASSWORD
INITIAL_ADMIN_PASSWORD
```

Acceptance criteria:

- `git grep -n -E "password|TOKEN|TUNNEL_TOKEN|SECRET|Default2026"` no longer reveals real secrets.
- Only `.env.example` files contain placeholders.
- Deployment scripts fail clearly if required environment variables are missing.

### Finding 2: P1 - Backup/runtime data committed

Files observed:

- `data/db.backup-1777833425197.json`
- `data/db.backup-1777833902317.json`

Issue:

Tracked backup files contain user records, `passwordHash`, and operational data. Even hashed passwords should not be committed, especially in a public repo.

Required action:

- Remove real backup/runtime JSON files from git tracking.
- Add stronger ignore rules for runtime DB/backup files.
- Add a sanitized seed/demo file if sample data is needed.
- Treat the existing hashes as exposed and reset affected users' passwords.

Suggested `.gitignore` additions:

```gitignore
data/*.json
data/backup/
data/*.backup-*.json
scratch/
*.log
screenshots/
```

Acceptance criteria:

- No tracked file contains `passwordHash` except code references that remove or handle the property.
- App can still initialize a clean DB or import a sanitized seed.
- Docs explain where runtime data lives and how to back it up safely.

### Finding 3: P1 - Stored XSS via `innerHTML`

Primary file:

- `public/index.html`

Representative risky areas:

- Work order table and modal around lines near `1326`.
- Asset table and detail render around `1493`.
- Template/checklist render sections.
- Notification, vendor, purchase order, tenant request, webhook/API-key lists.

Issue:

Many API fields are inserted into HTML template strings and assigned to `innerHTML` without escaping. User-controlled data such as work order title, description, history note, asset name, tenant request description, vendor name, webhook label/URL, etc. can become stored XSS.

Required action:

- Add a small `escapeHtml` helper.
- Escape every user/API-derived value before interpolation into HTML strings.
- Use `textContent`/DOM creation for new code where practical.
- Keep static trusted HTML separate from dynamic text.

Suggested helper:

```js
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
```

Acceptance criteria:

- A work order title like `<img src=x onerror=alert(1)>` displays as text, not executable markup.
- Tenant request descriptions display safely.
- Webhook URLs and labels display safely.
- Add a regression test or small script that checks representative XSS payloads render escaped.

### Finding 4: P1 - Weak default admin password

Primary file:

- `server.js`

Issue:

`initDB()` creates `admin` with password `admin`. This is dangerous with a public repo and one-command setup instructions.

Required action:

- In production, require `INITIAL_ADMIN_PASSWORD` during first DB initialization.
- Fail fast if production starts without `INITIAL_ADMIN_PASSWORD` and no DB exists.
- In development only, allow a generated or clearly logged temporary password, not `admin`.
- Mark initial admin as `mustChangePassword: true`.
- Require password change on first login or block sensitive actions until changed.

Acceptance criteria:

- Production startup with no DB and no `INITIAL_ADMIN_PASSWORD` exits with a clear error.
- Clean dev startup does not create `admin/admin`.
- Existing login flow still works for initialized DBs.
- Docs and `.env.example` mention `INITIAL_ADMIN_PASSWORD`.

### Finding 5: P2 - Shift check-in/check-out compares wrong session property

Primary file:

- `server.js`

Issue:

Session object stores `userId`, but shift authorization checks compare against `session.id`:

```js
shift.userId !== session.id
```

`session.id` is undefined, so operators cannot reliably check in/out of their own shift.

Required action:

- Replace `session.id` with `session.userId` in check-in and check-out authorization.
- Return proper `403` status for permission failures.
- Add tests for:
  - operator can check in/out own shift.
  - operator cannot check in/out another user's shift.
  - admin/manager can check in/out if current behavior intends that.

Acceptance criteria:

- Operator own-shift check-in/check-out succeeds.
- Operator other-shift check-in/check-out fails.
- Regression test covers both endpoints.

### Finding 6: P2 - JSON DB write is not atomic

Primary file:

- `server.js`

Issue:

`saveDB()` writes the entire DB directly with `fs.writeFileSync(DB_PATH, JSON.stringify(...))`. If the process crashes mid-write, `db.json` can be corrupted. Under concurrent requests, writes may also clobber each other.

Required action:

- Write to a temporary file first, then rename into place.
- Optionally keep a `.bak` copy of the last known-good DB.
- Add a simple write queue/mutex if multiple async paths can call save concurrently.
- Longer-term: migrate to SQLite or PostgreSQL.

Suggested minimal atomic write:

```js
function saveDB(db) {
  _dbCache = db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  const data = JSON.stringify(db, null, 2);
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, DB_PATH);
  try { _dbMtime = fs.statSync(DB_PATH).mtimeMs; } catch {}
}
```

Acceptance criteria:

- `saveDB()` never writes partial JSON directly to `DB_PATH`.
- Temp files are cleaned up on normal successful writes.
- App still initializes and saves DB correctly on Windows and Linux.

## Additional Recommendations

### Security headers

Current headers are a useful start, but there is no CSP. After XSS cleanup, add a conservative Content Security Policy. Because the app currently uses many inline scripts/styles, CSP may require refactoring or a transitional policy.

### Session handling

Sessions are stored in an in-memory `Map`. This means:

- All sessions are lost on restart.
- Multi-instance deployment will break.
- No cleanup of expired sessions in memory.

Recommended:

- Store `expiresAt` per session and enforce it in `getSession()`.
- Periodically delete expired sessions.
- Later use Redis, SQLite, or signed encrypted cookies.

### API keys

API keys are currently stored in plaintext in JSON DB. Prefer storing a hash of the key and only showing the raw key once at creation time.

### Webhook SSRF

Webhook URLs are admin-created, but still consider restricting private/internal destinations if public admins or compromised admins are in scope. At minimum add timeout, max response size, and error logging that does not leak secrets.

### Project structure

`server.js` and `public/index.html` are very large. Split gradually:

- `routes/auth.js`
- `routes/assets.js`
- `routes/workOrders.js`
- `routes/shifts.js`
- `lib/db.js`
- `lib/auth.js`
- frontend modules for render helpers and API client

Do not do a large refactor before fixing P0/P1 issues.

## Ready-to-Paste Prompt for Another AI

Copy the section below into another AI agent.

```text
You are a senior software engineer working on the public repository:
https://github.com/trucdienhapulico-ai/cmms-webapp

Goal:
Harden the CMMS WebApp enough for safer internal/controlled deployment. Prioritize security and data-safety fixes. Keep changes scoped and avoid large unrelated refactors.

Context:
- Backend: Node.js + Express in server.js.
- Frontend: Vanilla JS in public/index.html and public/tenant.html.
- Persistence: JSON file under data/db.json.
- Deployment: Docker Compose under deploy/docker-compose.yml and several NAS deployment scripts.
- Current verification: node --check server.js passed, npm audit --omit=dev passed, /api/health worked locally.

Critical findings to fix:

1. P0 secret exposure:
   - Remove hardcoded SSH/sudo passwords and Cloudflare tunnel token from tracked files.
   - Affected files include deploy.js, check_nas.js, push-docker-compose.js, deploy/scripts/deploy-to-nas.js, test-ssh.js, test-ssh-logs.js, deploy/docker-compose.yml, and scratch scripts.
   - Replace with environment variables such as NAS_HOST, NAS_PORT, NAS_USER, NAS_PASSWORD, CLOUDFLARE_TUNNEL_TOKEN.
   - Do not include real secrets in code, docs, examples, test output, or commit messages.
   - Add clear fail-fast checks when required env vars are missing.
   - Mention in docs that already-exposed secrets must be rotated outside the repo.

2. P1 committed backup/runtime data:
   - Remove tracked data/db.backup-*.json files.
   - Strengthen .gitignore for runtime DB, backups, logs, scratch files, and screenshots.
   - If sample data is needed, create sanitized seed data without passwordHash or real operational details.
   - Ensure no tracked file contains real password hashes or runtime data.

3. P1 stored XSS:
   - In public/index.html, add an escapeHtml helper.
   - Escape API/user-derived values before inserting into innerHTML.
   - Cover at least work orders, assets, tenant requests, vendors, purchase orders, checklist templates, notifications, webhooks/API keys.
   - public/tenant.html track result should also escape category/description/workOrderId/status before innerHTML, or use textContent/DOM nodes.
   - Add a regression test or minimal verification script for representative XSS payloads.

4. P1 weak default admin password:
   - server.js initDB currently creates admin/admin.
   - In production, require INITIAL_ADMIN_PASSWORD when creating a new DB.
   - Fail fast with a clear message if production has no DB and INITIAL_ADMIN_PASSWORD is missing.
   - In development, do not silently create admin/admin; use env var or a generated temporary password.
   - Update env/*.env.example and docs.

5. P2 shift check-in/check-out authorization bug:
   - server.js stores session.userId but compares shift.userId to session.id.
   - Replace session.id with session.userId.
   - Return HTTP 403 for forbidden operator access.
   - Add tests for own shift vs other user's shift.

6. P2 non-atomic JSON DB write:
   - Modify saveDB() in server.js to write to a temp file and rename atomically.
   - Keep behavior compatible with Windows and Linux.
   - Optionally keep last-good backup or cleanup stale temp files.

Constraints:
- Do not rotate actual secrets in code; just remove references and document external rotation.
- Do not do broad framework migration in this pass.
- Preserve existing behavior and UI unless needed for security.
- Keep edits small enough to review.
- Do not commit generated node_modules.

Expected deliverables:
- Code changes implementing the fixes above.
- Updated .gitignore and env examples.
- Updated README/deploy docs explaining required env vars and secret rotation.
- Tests or verification scripts covering auth bootstrap, shift permission, and XSS escaping.
- A final summary listing changed files and exact verification commands run.

Suggested verification commands:

node --check server.js
npm audit --omit=dev
npm start

Then verify:
- GET /api/health returns ok.
- Production clean DB startup fails if INITIAL_ADMIN_PASSWORD is missing.
- Production clean DB startup succeeds if INITIAL_ADMIN_PASSWORD is set.
- XSS payloads are displayed as text, not executed.
- Operator can check in/out own shift and cannot check in/out another user's shift.
- git grep -n -E "password|TOKEN|TUNNEL_TOKEN|SECRET|Default2026|passwordHash" -- . ':!package-lock.json' does not reveal real secrets or real password hashes.
```

## Suggested Work Order

1. Remove secrets from code/config and update `.gitignore`.
2. Remove tracked runtime backup data and replace with sanitized seed if needed.
3. Fix `initDB()` bootstrap password behavior.
4. Fix shift authorization bug.
5. Add `escapeHtml` and patch frontend render paths.
6. Make `saveDB()` atomic.
7. Add focused tests/verification scripts.
8. Run verification commands and summarize results.

## Notes for Repository Owner

Code changes cannot undo already-exposed secrets. After applying the patch:

- Rotate NAS SSH/sudo password or switch to SSH key with restricted privileges.
- Revoke/regenerate Cloudflare tunnel token.
- Reset passwords for users represented in committed backup files.
- Consider making the repo private until history cleanup is complete.
- If rewriting git history, coordinate with any clones/deploy scripts before force-pushing.
