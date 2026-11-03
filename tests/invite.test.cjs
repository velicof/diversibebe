// Private beta gate (/v2): only invited devices pass; the server never stores plain codes.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('./load-ts.cjs');
const {inviteAccepted,inviteHashes,sha256Hex}=load('src/lib/security/invite.ts');
const hash=c=>crypto.createHash('sha256').update(c).digest('hex');
test('invite codes are compared by SHA-256, case-insensitively, and malformed input is rejected',async()=>{
  assert.equal(await sha256Hex('BETA-2026-ALFA'),hash('BETA-2026-ALFA'));
  const hashes=inviteHashes(` ${hash('BETA-2026-ALFA')} ,not-a-hash,${hash('BETA-2026-BETA').toUpperCase()}`);
  assert.equal(hashes.length,2);
  assert.equal(await inviteAccepted('beta-2026-alfa',hashes),true);
  assert.equal(await inviteAccepted('BETA-2026-BETA',hashes),true);
  for(const code of [undefined,'','BETA-2026-GAMA','short',"x' OR 1=1 --",'A'.repeat(65)]) assert.equal(await inviteAccepted(code,hashes),false,String(code));
  assert.deepEqual([...inviteHashes(undefined)],[]);
});
