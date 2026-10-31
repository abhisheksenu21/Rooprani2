import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

await build({
  entryPoints: [path.join(rootDir, 'src/server/app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  outfile: path.join(rootDir, 'api/_handler.mjs'),
  banner: {
    js: '// Auto-generated Vercel Serverless API bundle from src/server/app.ts',
  },
});

console.log('Built Vercel Serverless API bundle -> api/_handler.mjs');
