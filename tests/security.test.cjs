const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(relative, auth = { data: { user: null }, error: null }) {
  let calls = 0;
  const compiledModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  vm.runInNewContext(source, {
    exports: compiledModule.exports, module: compiledModule,
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === '@/lib/supabase/server') return { createClient: async () => {
        if (auth instanceof Error) throw auth;
        return { auth: { getUser: async () => auth } };
      } };
      throw new Error('Unexpected dependency: ' + name);
    },
    URL, Response,
    fetch() { calls++; throw new Error('Network forbidden during tests'); },
    process: { env: {} },
  });
  return { api: compiledModule.exports, networkCalls: () => calls };
}

test('redirect attacks are rejected and internal return paths preserved', () => {
  const { safeReturnPath } = load('src/lib/security/return-path.ts').api;
  for (const value of [null, 'https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/\nevil.invalid', 'javascript:alert(1)', ' /dashboard']) {
    assert.equal(safeReturnPath(value), '/dashboard', String(value));
  }
  assert.equal(safeReturnPath('/plan?week=2#masa'), '/plan?week=2#masa');
  assert.equal(safeReturnPath('/forgot-password/new-password'), '/forgot-password/new-password');
});

test('anonymous chat cannot call a paid model', async () => {
  const route = load('src/app/api/chat/route.ts');
  assert.equal((await route.api.POST()).status, 401);
  assert.equal(route.networkCalls(), 0);
});

test('invalid sessions cannot call a paid model', async () => {
  const route = load('src/app/api/chat/route.ts', { data: { user: { id: 'synthetic' } }, error: { message: 'expired' } });
  assert.equal((await route.api.POST()).status, 401);
  assert.equal(route.networkCalls(), 0);
});

test('authenticated chat remains paused without sending child data', async () => {
  const route = load('src/app/api/chat/route.ts', { data: { user: { id: 'synthetic' } }, error: null });
  const response = await route.api.POST();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(route.networkCalls(), 0);
});

test('authentication outages fail closed without diagnostic disclosure', async () => {
  const route = load('src/app/api/chat/route.ts', new Error('private diagnostic'));
  const response = await route.api.POST();
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private diagnostic/);
  assert.equal(route.networkCalls(), 0);
});

test('retired mail route cannot send arbitrary email', async () => {
  const route = load('src/app/api/send-verification/route.ts');
  assert.equal((await route.api.POST()).status, 410);
  assert.equal(route.networkCalls(), 0);
});
