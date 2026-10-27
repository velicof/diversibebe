const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.isAbsolute(relative) ? relative : path.join(root, relative);
  if (cache.has(file)) return cache.get(file);
  const compiledModule = { exports: {} }; cache.set(file, compiledModule.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: compiledModule.exports, module: compiledModule, console, Intl, Date, URL, Set, Map, AbortSignal, crypto: require('node:crypto').webcrypto,
    require(name) {
      if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'));
      if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
      return require(name);
    },
  }, { filename: file });
  return compiledModule.exports;
}
module.exports = { load, plain: (value) => JSON.parse(JSON.stringify(value)) };
