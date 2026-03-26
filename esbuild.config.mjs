import { build } from 'esbuild';

const version = process.env.npm_package_version || '0.0.0';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  define: {
    '__VERSION__': JSON.stringify(version),
  },
  external: [
    '@modelcontextprotocol/sdk',
    'zod',
    'node:*',
    'module',
  ],
  sourcemap: false,
  minify: false,
  treeShaking: true,
});

console.log('Build complete — dist/index.js');
