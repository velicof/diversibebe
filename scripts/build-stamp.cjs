// Names the code inside a build, so a phone can show which commit it was given.
// "+local" means the build also holds changes that were not committed: the commit alone does not describe it.
const { spawnSync } = require('node:child_process'), path = require('node:path');
const repo = path.resolve(__dirname, '..');
// Only what ends up in the build: notes and photo candidates in progress do not change what a phone receives.
const BUILT = ['src', 'public', 'content/catalog.generated.json', 'next.config.ts', 'package-lock.json'];
function git(...args) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  return r.status === 0 ? r.stdout.trim() : '';
}
function buildStamp() {
  // The last commit that changed built code: a later commit of notes leaves the same code, and the same name.
  const commit = git('log', '-1', '--format=%h', '--', ...BUILT);
  if (!commit) return 'necunoscut';
  return git('status', '--porcelain', '--', ...BUILT) ? `${commit}+local` : commit;
}
module.exports = { buildStamp };
