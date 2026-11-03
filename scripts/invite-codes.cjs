// Generates private-beta invite codes. Codes go to invited parents (one per family);
// only the comma-separated hashes go into the Vercel env V2_INVITE_CODE_HASHES. Never commit the codes.
//   node scripts/invite-codes.cjs 30
//   node scripts/invite-codes.cjs 2 --review   → specialist review console codes (V2_REVIEW_CODE_HASHES)
const crypto = require('node:crypto');
const count = Math.min(Math.max(Number(process.argv[2]) || 1, 1), 200);
const review = process.argv.includes('--review');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const code = () => 'DB-' + Array.from(crypto.randomBytes(12), (b) => alphabet[b % alphabet.length]).join('').replace(/(.{4})(?!$)/g, '$1-');
const codes = Array.from({ length: count }, code);
console.log(review ? 'Coduri de revizie (fondator, specialist; nu se salvează în repository):' : 'Coduri (se trimit separat fiecărei familii, nu se salvează în repository):');
console.log(codes.join('\n'));
console.log('\n' + (review ? 'V2_REVIEW_CODE_HASHES=' : 'V2_INVITE_CODE_HASHES=') + codes.map((c) => crypto.createHash('sha256').update(c).digest('hex')).join(','));
