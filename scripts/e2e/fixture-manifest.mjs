import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixture-only transport: use Expo's real manifest and real launch asset, but
// avoid regenerating that manifest (and resolving assets/config) on every launch.
export async function startFixtureManifest(manifest) {
  if (new URL(manifest.launchAsset?.url).origin !== 'http://localhost:8081') throw new Error('Expected local Metro launch asset');
  const body = JSON.stringify(manifest);
  const server = http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    if (new URL(request.url, 'http://localhost').pathname !== '/') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'application/expo+json', 'expo-protocol-version': '0',
      'expo-sfv-version': '0', 'cache-control': 'private, max-age=0' });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startFixtureManifest(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))).then(({ server, url }) => {
    fs.writeFileSync(process.argv[3], url);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
      server.closeAllConnections(); server.close(() => process.exit(0));
    });
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
