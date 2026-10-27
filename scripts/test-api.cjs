// Test-only Supabase HTTP contract fixture. NOT GoTrue or PostgREST, never deploy.
// Real PostgreSQL + real application RPCs/RLS; synthetic authentication transport.
const http = require("node:http"),
  crypto = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  createDatabase,
  asUser,
  USERS,
} = require("../tests/fixtures/database.cjs");
const root = path.resolve(__dirname, ".."),
  privateDir = path.join(root, ".local-test-db");
const accessFile = path.resolve(root, "../finalization/local-test-access.json");
fs.mkdirSync(privateDir, { recursive: true });
fs.mkdirSync(path.dirname(accessFile), { recursive: true });
let access;
if (fs.existsSync(accessFile))
  access = JSON.parse(fs.readFileSync(accessFile, "utf8"));
else {
  access = {
    accounts: Object.entries(USERS).map(([key, id]) => ({
      id,
      email: `parent-${key.toLowerCase()}@example.test`,
      password: crypto.randomBytes(20).toString("base64url"),
    })),
  };
  fs.writeFileSync(accessFile, JSON.stringify(access, null, 2));
}
const secretFile = path.join(privateDir, "jwt-secret");
const secret = fs.existsSync(secretFile)
  ? fs.readFileSync(secretFile)
  : crypto.randomBytes(32);
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, secret);
const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
function token(user) {
  const header = encode({ alg: "HS256", typ: "JWT" }),
    payload = encode({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      app_metadata: { is_test: true },
      iss: "http://127.0.0.1:54329/auth/v1",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  const data = header + "." + payload;
  return (
    data +
    "." +
    crypto.createHmac("sha256", secret).update(data).digest("base64url")
  );
}
function verify(value) {
  try {
    const [h, p, s] = value.split("."),
      sig = crypto
        .createHmac("sha256", secret)
        .update(h + "." + p)
        .digest();
    const supplied = Buffer.from(s, "base64url");
    if (
      sig.length !== supplied.length ||
      !crypto.timingSafeEqual(sig, supplied)
    )
      return null;
    const data = JSON.parse(Buffer.from(p, "base64url"));
    if (data.exp < Date.now() / 1000) return null;
    return access.accounts.find((a) => a.id === data.sub) ?? null;
  } catch {
    return null;
  }
}
const publicUser = (user) => ({
  id: user.id,
  aud: "authenticated",
  role: "authenticated",
  email: user.email,
  email_confirmed_at: "2026-10-27T00:00:00Z",
  app_metadata: { provider: "email", is_test: true },
  user_metadata: {},
  identities: [],
  created_at: "2026-10-27T00:00:00Z",
  updated_at: "2026-10-27T00:00:00Z",
  is_anonymous: false,
});
const refreshes = new Map(),
  attempts = new Map();
function session(user) {
  const refresh = crypto.randomBytes(32).toString("base64url");
  refreshes.set(refresh, user.id);
  return {
    access_token: token(user),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refresh,
    user: publicUser(user),
  };
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new Error("large body");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks)) : {};
}
(async () => {
  const databaseName = process.env.V2_TEST_DB_NAME || "postgres-verified";
  if (!/^[a-z0-9-]{1,60}$/.test(databaseName)) throw new Error("Invalid isolated database name");
  const db = await createDatabase(
    path.join(privateDir, databaseName),
  );
  let serial = Promise.resolve();
  const query = (user, fn) => {
    const next = serial.then(() => asUser(db, user?.id, fn));
    serial = next.catch(() => {});
    return next;
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    if (
      req.headers.origin &&
      !["http://127.0.0.1:3100", "http://localhost:3100"].includes(
        req.headers.origin,
      )
    ) {
      res.writeHead(403).end("{}");
      return;
    }
    res.setHeader(
      "Access-Control-Allow-Origin",
      req.headers.origin || "http://127.0.0.1:3100",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:54329");
    function send(status, data) {
      res.writeHead(status).end(JSON.stringify(data));
    }
    try {
      if (url.pathname === "/health") {
        send(200, {
          kind: "TEST FIXTURE: PostgreSQL/RLS + synthetic auth transport",
          officialSupabase: false,
        });
        return;
      }
      if (url.pathname === "/auth/v1/token") {
        const input = await body(req);
        let user;
        if (url.searchParams.get("grant_type") === "refresh_token") {
          const id = refreshes.get(input.refresh_token);
          refreshes.delete(input.refresh_token);
          user = access.accounts.find((a) => a.id === id);
        } else {
          const key = String(input.email),
            now = Date.now(),
            bucket = attempts.get(key) ?? { time: now, count: 0 };
          if (now - bucket.time > 60000) {
            bucket.time = now;
            bucket.count = 0;
          }
          bucket.count++;
          attempts.set(key, bucket);
          if (bucket.count > 20) {
            send(429, {
              error_code: "over_request_rate_limit",
              msg: "Test login rate limit",
            });
            return;
          }
          user = access.accounts.find(
            (a) => a.email === input.email && a.password === input.password,
          );
        }
        if (!user) {
          send(400, {
            error: "invalid_grant",
            error_code: "invalid_credentials",
            error_description: "Invalid test credentials",
          });
          return;
        }
        send(200, session(user));
        return;
      }
      const user = verify(
        (req.headers.authorization || "").replace(/^Bearer /i, ""),
      );
      if (!user) {
        send(401, { code: "bad_jwt", message: "Authentication required" });
        return;
      }
      if (url.pathname === "/auth/v1/user") {
        send(200, { ...publicUser(user) });
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        for (const [key, id] of refreshes)
          if (id === user.id) refreshes.delete(key);
        send(200, {});
        return;
      }
      const name = url.pathname.split("/").pop();
      if (
        !url.pathname.startsWith("/rest/v1/rpc/") ||
        ![
          "v2_load_state",
          "v2_apply_action",
          "v2_record_event",
          "consume_bebeasist_quota",
        ].includes(name)
      ) {
        send(404, { message: "Test fixture endpoint unavailable" });
        return;
      }
      const input = await body(req);
      const args =
        name === "v2_load_state"
          ? [input.p_baby_id ?? null]
          : name === "v2_apply_action"
            ? [
                input.p_baby_id ?? null,
                input.p_action,
                JSON.stringify(input.p_payload),
              ]
            : name === "v2_record_event"
              ? [
                  input.p_event_id,
                  input.p_name,
                  JSON.stringify(input.p_properties ?? {}),
                ]
              : [];
      const result = await query(user, (d) =>
        d.query(
          `SELECT public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) AS value`,
          args,
        ),
      );
      send(200, result.rows[0].value ?? null);
    } catch (e) {
      send(e.code === "42501" ? 403 : 400, {
        code: e.code || "test_error",
        message: "Test request rejected",
      });
    }
  });
  server.listen(54329, "127.0.0.1", () =>
    console.log(
      "Local TEST FIXTURE at http://127.0.0.1:54329 (not official Supabase). Credentials kept in untracked local file.",
    ),
  );
  async function stop() {
    server.close();
    await serial;
    await db.close();
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
