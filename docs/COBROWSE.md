# Cobrowse.io Integration — docs/COBROWSE.md

> Reference doc for GroTap's Cobrowse.io co-browsing support integration.
> Covers architecture, env config, API endpoints, client SDK wiring, and session audit.
>
> **Feature reference:** For the full Cobrowse.io capabilities catalog (annotations, remote control, data redaction, device modes), platform SDK matrix, and native mobile integration guide, see `docs/COBROWSE_FEATURES.md`.

---

## 1. Purpose

Cobrowse.io provides **live co-browsing** so support agents can see and interact with
a user's dashboard session in real time. This is opt-in: users click a floating "?"
button to start a session; agents authenticate via a signed JWT.

If the Cobrowse env vars are not set, the feature is silently disabled — no pages break.

---

## 2. Architecture

```
┌──────────── Client (Browser) ──────────────┐
│                                             │
│  cobrowse.js module                         │
│   ├─ GET /api/cobrowse/config → license key │
│   ├─ Load CobrowseIO SDK from CDN           │
│   ├─ CobrowseIO.start()                     │
│   └─ Session events → POST /api/cobrowse/   │
│        sessions (audit trail)               │
│                                             │
│  Floating "?" button (hidden until SDK init)│
└─────────────────┬───────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────┐
│  Express API (src/api/)                     │
│   ├─ GET  /config       → { enabled, license }
│   ├─ GET  /agent-token  → signed JWT (admin)│
│   ├─ POST /sessions     → log session event │
│   └─ GET  /sessions     → paginated history │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Supabase — cobrowse_sessions table         │
│  (org-scoped, RLS-enforced)                 │
└─────────────────────────────────────────────┘
```

**Key fact:** Cobrowse.io does **not** send server-side webhooks. All session
lifecycle events come from the client SDK via JavaScript callbacks. The
original `app.js` TODO for a pre-Helmet webhook route was a misconception
and has been corrected.

---

## 3. Environment Variables

| Variable             | Where used   | Description |
|----------------------|-------------|-------------|
| `COBROWSE_API_KEY`   | Server only  | RSA 2048-bit private key in PEM format. Used to sign JWTs for agent authentication (RS256). |
| `COBROWSE_API_TOKEN` | Client (via API) | Cobrowse license key from the Cobrowse.io dashboard. Passed to `CobrowseIO.license` in the browser. |

Both must be set for Cobrowse to be enabled. If either is missing, `isCobrowseEnabled()` returns `false`
and the `/config` endpoint returns `{ enabled: false }`.

The RSA key in `.env` uses double-quoted value with `\n` for line breaks:
```
COBROWSE_API_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
```

---

## 4. Server-Side Components

### 4.1 Library — `src/api/lib/cobrowse.js`

| Export              | Description |
|---------------------|-------------|
| `isCobrowseEnabled()` | Returns `true` if both env vars are set |
| `getClientConfig()`   | Returns `{ enabled, license }` for the client SDK |
| `signAgentToken({ email, orgId })` | Signs a JWT (RS256, 1-hour expiry) for Cobrowse agent dashboard auth |

### 4.2 Route — `src/api/routes/cobrowse.js`

Mounted at `/api/cobrowse` in `app.js` (standard API route, **not** pre-Helmet).

| Method | Path           | Auth      | Description |
|--------|----------------|-----------|-------------|
| GET    | `/config`      | Any user  | Returns `{ enabled, license }` for SDK init |
| GET    | `/agent-token` | Admin only | Returns `{ token }` — signed JWT for Cobrowse agent dashboard |
| POST   | `/sessions`    | Any user  | Logs a session event (session_id, session_state, metadata) |
| GET    | `/sessions`    | Any user  | Paginated session history for the org (audit) |

### 4.3 Migration — `supabase/migrations/00003_cobrowse_sessions.sql`

Table: `cobrowse_sessions`

| Column         | Type        | Notes |
|----------------|-------------|-------|
| `id`           | UUID (PK)   | Auto-generated |
| `org_id`       | TEXT         | Tenant scoping |
| `user_id`      | UUID         | Who initiated the session |
| `user_email`   | TEXT         | Denormalized for audit readability |
| `session_id`   | TEXT         | Cobrowse session ID |
| `session_state`| TEXT         | `pending` \| `authorizing` \| `active` \| `ended` |
| `started_at`   | TIMESTAMPTZ  | Defaults to `now()` |
| `ended_at`     | TIMESTAMPTZ  | Set when state = `ended` |
| `metadata`     | JSONB        | Session code, agent info, etc. |
| `created_at`   | TIMESTAMPTZ  | Record creation |
| `updated_at`   | TIMESTAMPTZ  | Auto-updated by trigger |

**RLS:** org isolation via `org_id` claim from JWT.
**Indexes:** `org_id`, `session_id`, `session_state`.

---

## 5. Client-Side Components

### 5.1 Module — `src/dashboard/public/js/cobrowse.js`

| Export            | Description |
|-------------------|-------------|
| `initCobrowse({ email, orgId })` | Fetches config, loads SDK from CDN, starts CobrowseIO, wires event listeners |
| `startSession()`  | Creates a new Cobrowse session (called by support button click) |

**Lifecycle:**
1. `initCobrowse()` calls `GET /api/cobrowse/config`
2. If `enabled: false` → returns silently (no SDK loaded, button stays hidden)
3. Dynamically loads `https://js.cobrowse.io/CobrowseIO.js`
4. Sets `CobrowseIO.license` and `CobrowseIO.customData`
5. Calls `CobrowseIO.start()`
6. Shows the floating support button (adds `.active` class)
7. Wires event listeners: `session.loaded` → pending, `session.updated` → active/authorizing, `session.ended` → ended
8. Each event fires a `POST /api/cobrowse/sessions` (fire-and-forget)

### 5.2 CSS — `.cobrowse-support-btn` in `css/styles.css`

Fixed-position floating circle button, bottom-right corner. Hidden by default
(`display: none`), shown when `.active` class is added after SDK init.

### 5.3 HTML Pages

The Cobrowse init + support button is added to all 7 authenticated pages:
- `home.html`, `rfid.html`, `setup.html`, `erp.html`
- `stripe-admin.html`, `dev-resources.html`, `cases.html`

**Not** added to `login.html` or `reset.html` (unauthenticated pages).

---

## 6. CSP Configuration

Helmet CSP in `app.js` already allows:
- `scriptSrc`: `https://js.cobrowse.io` (SDK script)
- `connectSrc`: `https://cobrowse.io` (SDK WebSocket/XHR)

---

## 7. Testing

`tests/routes/cobrowse.test.js` — 12 tests covering:
- Auth enforcement on all 4 endpoints
- Config returns enabled/disabled states
- Agent token signing (admin-only + 503 when not configured)
- Session creation with validation (missing session_id, invalid state defaults)
- Paginated session listing

---

## 8. Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Env vars missing | `enabled: false`, SDK never loaded, button hidden |
| CDN unreachable | `initCobrowse()` catches error, logs warning, page works normally |
| Session POST fails | Fire-and-forget, logged to console, no user impact |
| RSA key malformed | `signAgentToken()` throws, caught by error handler → 500 |
| Supabase down | Session audit inserts fail → 500 on POST/GET sessions, but co-browsing itself still works (it's peer-to-peer via Cobrowse servers) |

---

## 9. Related Files

| File | Role |
|------|------|
| `.env` / `.env.example` | Env var definitions |
| `src/api/lib/cobrowse.js` | JWT + config server lib |
| `src/api/routes/cobrowse.js` | API endpoints |
| `src/dashboard/public/js/cobrowse.js` | Client SDK wrapper |
| `src/dashboard/public/css/styles.css` | Support button styles |
| `supabase/migrations/00003_cobrowse_sessions.sql` | DB migration |
| `tests/routes/cobrowse.test.js` | Test suite |
| `src/api/app.js` | Route mounting + CSP config |
