// Tries to read and change family data without the right to, over HTTP, as an outsider would. It creates two
// synthetic @example.test families on the local stack. Refuses anything but loopback or a private Tailscale name.
//   node scripts/access-attack.cjs <baseUrl> [outFile]
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const base = process.argv[2] || 'http://127.0.0.1:3105', outFile = process.argv[3];
const host = new URL(base).hostname;
if (!/^(127\.0\.0\.1|localhost)$/.test(host) && !/^[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/.test(host)) throw new Error('Local or private addresses only');
const { anonKey, jwtSecret } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../real-supabase-runtime/private/runtime.json'), 'utf8'));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) }); console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${detail !== '' ? ` (${String(detail).slice(0, 130)})` : ''}`); };
const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const sign = (claims, secret) => { const head = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64(claims); return head + '.' + crypto.createHmac('sha256', secret).update(head).digest('base64url'); };
const call = (url, { token = anonKey, apikey = anonKey, method = 'GET', body, headers = {} } = {}) => fetch(base + url, { method, headers: { ...(apikey ? { apikey } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const rows = async (r) => { const t = await r.text(); try { const j = JSON.parse(t); return Array.isArray(j) ? j : null; } catch { return null; } };
const TABLES = ['profiles', 'babies', 'tried_foods', 'food_journal', 'allergy_records', 'favorite_recipes', 'cooked_recipes', 'custom_recipes', 'custom_foods', 'meal_plans', 'user_preferences', 'product_events', 'login_events', 'feedback', 'user_login_summary'];
const RPCS = [['v2_load_state', { p_baby_id: null }], ['v2_apply_action', { p_baby_id: null, p_action: 'favorite', p_payload: { recipeId: 'piure-morcov', enabled: true } }], ['v2_save_journey', { p_baby_id: null, p_journey: {} }], ['v2_edit_child', { p_baby_id: null, p_label: 'x', p_stage: 8 }], ['v2_mark_legacy_recipe', { p_recipe_id: 'piure-morcov' }]];
const stamp = Date.now(), password = `Local-${stamp}-pass`;
async function family(label) {
  const email = `attack-${label}-${stamp}@example.test`;
  const s = await (await call('/auth/v1/signup', { method: 'POST', body: { email, password } })).json();
  if (!s.access_token) throw new Error('signup failed: ' + JSON.stringify(s).slice(0, 120));
  const baby = await (await call('/rest/v1/babies', { token: s.access_token, method: 'POST', headers: { Prefer: 'return=representation' }, body: { user_id: s.user.id, name: `Copil ${label}`, birthdate: '2026-01-15', gender: 'girl' } })).json();
  const babyId = baby[0].id;
  await call('/rest/v1/rpc/v2_apply_action', { token: s.access_token, method: 'POST', body: { p_baby_id: babyId, p_action: 'favorite', p_payload: { recipeId: 'piure-morcov', enabled: true } } });
  await call('/rest/v1/allergy_records', { token: s.access_token, method: 'POST', body: { user_id: s.user.id, baby_id: babyId, food_id: 'ou', food_name: 'Ou', severity: 'usoara', notes: 'date private', recorded_at: new Date().toISOString() } });
  await call('/rest/v1/food_journal', { token: s.access_token, method: 'POST', body: { user_id: s.user.id, baby_id: babyId, food_id: 'morcov', food_name: 'Morcov', meal_type: 'pranz' } });
  return { email, id: s.user.id, token: s.access_token, babyId };
}

(async () => {
  const A = await family('a'), B = await family('b');
  const service = sign({ role: 'service_role', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 600 }, 'not-the-real-secret-not-the-real-secret');
  const outsiders = [
    ['anonymous key', { token: anonKey }],
    ['no credentials', { token: null, apikey: null }],
    ['forged token, wrong secret', { token: sign({ sub: A.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600 }, 'wrong-secret-wrong-secret-wrong-secret') }],
    ['forged service role', { token: service }],
    ['alg none token', { token: `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: A.id, role: 'service_role', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600 })}.` }],
    ['expired token of the real user', { token: sign({ sub: A.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) - 60 }, jwtSecret) }],
  ];
  for (const [who, cred] of outsiders) {
    let readable = [], writable = [], rpc = [];
    for (const table of TABLES) {
      const list = await rows(await call(`/rest/v1/${table}?select=*&limit=5`, cred));
      if (list && list.length) readable.push(table);
    }
    for (const table of ['babies', 'favorite_recipes', 'meal_plans', 'food_journal', 'allergy_records']) {
      const post = await call(`/rest/v1/${table}`, { ...cred, method: 'POST', body: { user_id: A.id, name: 'x', recipe_id: 'x', food_id: 'x', food_name: 'x' } });
      const patch = await call(`/rest/v1/${table}?user_id=eq.${A.id}`, { ...cred, method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { user_id: A.id } });
      const del = await call(`/rest/v1/${table}?user_id=eq.${A.id}`, { ...cred, method: 'DELETE', headers: { Prefer: 'return=representation' } });
      const changed = [patch, del].some(() => false);
      if (post.ok) writable.push(`POST ${table}`);
      for (const [verb, r] of [['PATCH', patch], ['DELETE', del]]) { const l = r.ok ? await rows(r) : null; if (l && l.length) writable.push(`${verb} ${table}`); }
      void changed;
    }
    for (const [name, body] of RPCS) { const r = await call(`/rest/v1/rpc/${name}`, { ...cred, method: 'POST', body }); if (r.ok) rpc.push(name); }
    check(`${who}: reads no family table`, readable.length === 0, readable.join());
    check(`${who}: changes nothing`, writable.length === 0, writable.join());
    check(`${who}: runs no V2 function`, rpc.length === 0, rpc.join());
  }

  // The data must still be there after all of that.
  const intact = await rows(await call(`/rest/v1/allergy_records?user_id=eq.${A.id}&select=id`, { token: A.token }));
  check('the family data survived the attempts', intact?.length === 1, intact?.length);

  // A signed-in parent against another family.
  const read = async (table) => rows(await call(`/rest/v1/${table}?user_id=eq.${B.id}&select=*`, { token: A.token }));
  for (const table of ['babies', 'allergy_records', 'food_journal', 'favorite_recipes']) { const l = await read(table); check(`another family: cannot read ${table}`, Array.isArray(l) && l.length === 0, l?.length); }
  const byId = await rows(await call(`/rest/v1/babies?id=eq.${B.babyId}&select=*`, { token: A.token }));
  check('another family: cannot read a child by id', Array.isArray(byId) && byId.length === 0);
  const foreignLoad = await call('/rest/v1/rpc/v2_load_state', { token: A.token, method: 'POST', body: { p_baby_id: B.babyId } });
  const foreignText = await foreignLoad.text();
  check("another family: v2_load_state refuses a foreign child", !foreignLoad.ok || !foreignText.includes(B.babyId), foreignLoad.status);
  const foreignWrite = await call('/rest/v1/rpc/v2_apply_action', { token: A.token, method: 'POST', body: { p_baby_id: B.babyId, p_action: 'favorite', p_payload: { recipeId: 'terci-ovaz', enabled: true } } });
  check('another family: v2_apply_action refuses a foreign child', !foreignWrite.ok, foreignWrite.status);
  const plant = await call('/rest/v1/favorite_recipes', { token: A.token, method: 'POST', body: { user_id: B.id, recipe_id: 'piure-banana' } });
  check('another family: cannot insert rows in their name', !plant.ok, plant.status);
  const steal = await call(`/rest/v1/babies?id=eq.${B.babyId}`, { token: A.token, method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { name: 'Furat' } });
  const stolen = steal.ok ? await rows(steal) : [];
  check('another family: cannot rename a child', !stolen?.length, stolen?.length);
  const adopt = await call(`/rest/v1/babies?id=eq.${A.babyId}`, { token: A.token, method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { user_id: B.id } });
  check('cannot give a child to another family', !adopt.ok, adopt.status);
  const after = await rows(await call(`/rest/v1/babies?id=eq.${B.babyId}&select=name`, { token: B.token }));
  check("the other family's child is unchanged", after?.[0]?.name === 'Copil b', after?.[0]?.name);

  // Auth surface.
  const admin = await call('/auth/v1/admin/users', { token: anonKey });
  check('auth admin API is closed', admin.status === 401 || admin.status === 403 || admin.status === 404, admin.status);
  const realEmail = await call('/auth/v1/signup', { method: 'POST', body: { email: 'someone@gmail.com', password } });
  check('the private test stack refuses real email addresses', realEmail.status === 400, realEmail.status);
  const relay = await call('/auth/v1/recover', { method: 'POST', body: { email: 'someone@gmail.com' } });
  check('recovery cannot send mail to real addresses', relay.status === 400, relay.status);
  const foreign = await call('/rest/v1/babies?select=id&limit=1', { headers: { Origin: 'https://evil.example' } });
  check('another website cannot call the backend from a browser', foreign.status === 403, foreign.status);
  for (const internal of ['/.env', '/private/runtime.json', '/../real-supabase-runtime/private/runtime.json', '/rest/v1/../../', '/auth/v1/../../private']) {
    const r = await fetch(base + internal, { redirect: 'manual' }).catch(() => null);
    const text = r ? await r.text() : '';
    check(`no server secret at ${internal}`, !text.includes(jwtSecret) && !/jwtSecret|dbPassword|serviceKey/.test(text), r?.status);
  }

  // What the pages themselves carry.
  for (const route of ['/v2', '/v2/azi', '/v2/idei', '/v2/plan', '/v2/profil', '/v2/cont', '/v2/jurnal']) {
    const html = await (await fetch(base + route)).text();
    check(`${route} HTML has no family data`, !/Copil a|Copil b|date private|attack-/.test(html));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ base, at: new Date().toISOString(), passed: results.length - failed, total: results.length, results }, null, 2));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
