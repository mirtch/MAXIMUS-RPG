// Bundles the Express app into api/index.mjs for Vercel serverless deployment
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const apiServerRequire = createRequire(path.resolve(root, 'artifacts/api-server/package.json'));
const { build } = apiServerRequire('esbuild');

await build({
  entryPoints: [path.resolve(root, 'api/_entry.ts')],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outfile: path.resolve(root, 'api/index.mjs'),
  external: ['*.node', 'pg-native'],
  sourcemap: 'linked',
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);
`,
  },
});

console.log('✅ API bundled to api/index.mjs');
