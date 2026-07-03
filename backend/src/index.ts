// Syncty backend — Cloudflare Worker + D1.
// Zero-knowledge: stores only opaque AES-GCM ciphertext blobs keyed by authId.
// ponytail: native fetch handler + tiny router. No framework dep. Add Hono if
// middleware (validation/sessions) grows beyond a few routes.

interface Env {
  DB: D1Database;
}

const AUTH_RE = /^[0-9a-f]{64}$/; // 32-byte authId as 64 hex chars
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120; // requests per authId per minute

// ponytail: in-memory rate limit. Resets on isolate cold start; good enough for
// an MVP. Upgrade to a Durable Object counter if abuse is observed.
const rate = new Map<string, { count: number; reset: number }>();

function cors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Auth-Id");
  return res;
}

function json(body: unknown, status = 200): Response {
  return cors(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

function allow(authId: string | null): boolean {
  if (!authId || !AUTH_RE.test(authId)) return false;
  const now = Date.now();
  const entry = rate.get(authId);
  if (!entry || now > entry.reset) {
    rate.set(authId, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const authId = request.headers.get("X-Auth-Id");
    // /health is the only unauthenticated route.
    if (url.pathname === "/health") return json({ ok: true });

    if (!allow(authId)) return json({ error: "unauthorized" }, 401);

    const p = url.pathname;
    try {
      if (p === "/vault" && request.method === "GET") return await getVault(env, authId!);
      if (p === "/vault" && request.method === "PUT") return await putVault(env, authId!, await request.json());
      if (p === "/devices" && request.method === "GET") return await listDevices(env, authId!);
      if (p === "/device" && request.method === "POST") return await upsertDevice(env, authId!, await request.json());
      if (p === "/device" && request.method === "DELETE") return await removeDevice(env, authId!, url.searchParams.get("device_id"));
      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: "bad request", detail: String(err) }, 400);
    }
  },
};

async function getVault(env: Env, authId: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT blob, version, updated_at FROM vaults WHERE auth_id = ?")
    .bind(authId).first<{ blob: string; version: number; updated_at: number }>();
  if (!row) return json({ error: "no vault" }, 404);
  return json({ blob: row.blob, version: row.version, updated_at: row.updated_at });
}

async function putVault(env: Env, authId: string, body: any): Promise<Response> {
  // Optimistic locking: client sends expectedVersion (what it read from GET).
  // Server controls the increment — client cannot set arbitrary versions.
  const blob = typeof body?.blob === "string" && body.blob.length > 0 ? body.blob : null;
  const expectedVersion = Number(body?.expectedVersion);
  if (!blob || !Number.isInteger(expectedVersion) || expectedVersion < 0) return json({ error: "invalid payload" }, 422);
  const now = Date.now();

  if (expectedVersion === 0) {
    // First push: try to insert a new vault.
    const result = await env.DB.prepare(
      "INSERT INTO vaults (auth_id, blob, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(auth_id) DO NOTHING"
    ).bind(authId, blob, now).run();
    if (result.meta.changes === 0) return json({ error: "conflict" }, 409);
    return json({ version: 1, updated_at: now });
  }

  // Update only if current version matches what the client read.
  const result = await env.DB.prepare(
    "UPDATE vaults SET blob = ?, version = version + 1, updated_at = ? WHERE auth_id = ? AND version = ?"
  ).bind(blob, now, authId, expectedVersion).run();
  if (result.meta.changes === 0) return json({ error: "conflict" }, 409);
  return json({ version: expectedVersion + 1, updated_at: now });
}

async function listDevices(env: Env, authId: string): Promise<Response> {
  const rows = await env.DB.prepare(
    "SELECT device_id, label, last_sync FROM devices WHERE auth_id = ? ORDER BY last_sync DESC"
  ).bind(authId).all<{ device_id: string; label: string; last_sync: number }>();
  return json({ devices: rows.results ?? [] });
}

async function upsertDevice(env: Env, authId: string, body: any): Promise<Response> {
  const deviceId = String(body?.device_id ?? "");
  const label = String(body?.label ?? "").slice(0, 64);
  if (!deviceId || !label) return json({ error: "device_id and label required" }, 422);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO devices (auth_id, device_id, label, last_sync) VALUES (?, ?, ?, ?)
     ON CONFLICT(auth_id, device_id) DO UPDATE SET label = excluded.label, last_sync = excluded.last_sync`
  ).bind(authId, deviceId, label, now).run();
  return json({ ok: true, last_sync: now });
}

async function removeDevice(env: Env, authId: string, deviceId: string | null): Promise<Response> {
  if (!deviceId) return json({ error: "device_id required" }, 422);
  await env.DB.prepare("DELETE FROM devices WHERE auth_id = ? AND device_id = ?")
    .bind(authId, deviceId).run();
  return json({ ok: true });
}
