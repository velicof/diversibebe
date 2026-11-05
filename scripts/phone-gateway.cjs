// One local address for the private phone preview: /auth/v1 and /rest/v1 go to the native gateway (which
// only lets @example.test accounts sign up), everything else to the Next.js preview. It listens on loopback;
// `tailscale serve` is the only way in, and only for the founder's own devices. PostgreSQL, GoTrue,
// PostgREST and the local mailbox stay unreachable from the phone.
//   V2_PHONE_PORT=3105 V2_PORT=3103 node scripts/phone-gateway.cjs
const http = require('node:http');
const listenPort = Number(process.env.V2_PHONE_PORT || 3105);
const appPort = Number(process.env.V2_PORT || 3103);
const gatewayPort = Number(process.env.V2_GATEWAY_PORT || 54321);

function publicHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
}
function route(req) {
  const path = new URL(req.url, 'http://local').pathname;
  if (path.startsWith('/auth/v1/admin')) return null;
  return path.startsWith('/auth/v1/') || path.startsWith('/rest/v1/') ? gatewayPort : appPort;
}

const server = http.createServer((req, res) => {
  const port = route(req);
  if (port === null) { res.writeHead(404).end(); return; }
  const headers = { ...req.headers };
  if (port === gatewayPort) {
    // The browser is on this address, so a call to the backend is same-origin: refuse any other page.
    if (headers.origin) {
      let originHost = '';
      try { originHost = new URL(headers.origin).host.toLowerCase(); } catch { /* Refused below. */ }
      if (originHost !== publicHost(req)) { res.writeHead(403).end(); return; }
      delete headers.origin;
    }
    delete headers.host;
  }
  const upstream = http.request({ hostname: '127.0.0.1', port, path: req.url, method: req.method, headers }, (reply) => {
    // A rebuild must reach the phone on the next load: Safari asks again for the page instead of trusting a copy.
    const replyHeaders = String(reply.headers['content-type'] || '').includes('text/html') ? { ...reply.headers, 'cache-control': 'no-cache' } : reply.headers;
    res.writeHead(reply.statusCode || 502, replyHeaders);
    reply.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Serviciul local nu răspunde. Verifică scripts/phone-preview.cjs pe laptop.');
  });
  req.pipe(upstream);
});
server.listen(listenPort, '127.0.0.1', () => console.log(`Phone gateway: http://127.0.0.1:${listenPort} → app ${appPort}, backend ${gatewayPort}`));
