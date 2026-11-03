const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Local builds default to preview content (scripts/build-v2.cjs); `loader({...})` simulates another build environment.
function loader(env = {}) {
  const cache = new Map(), processEnv = { NEXT_PUBLIC_V2_CONTENT_MODE: 'preview', ...process.env, ...env };
  function load(relative) {
    const file = path.isAbsolute(relative) ? relative : path.join(root, relative);
    if (cache.has(file)) return cache.get(file);
    const compiledModule = { exports: {} }; cache.set(file, compiledModule.exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: compiledModule.exports, module: compiledModule, console, Intl, Date, URL, URLSearchParams, Set, Map, AbortSignal, TextEncoder, Uint8Array, crypto: require('node:crypto').webcrypto,
      process: { env: processEnv },
      require(name) {
        if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'));
        if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
        return require(name);
      },
    }, { filename: file });
    return compiledModule.exports;
  }
  return load;
}
module.exports = { load: loader(), loader, plain: (value) => JSON.parse(JSON.stringify(value)) };
