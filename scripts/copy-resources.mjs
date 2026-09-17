import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'dist');

for (const rel of ['nodes/ShalomApi/icons']) {
	const from = join(srcDir, rel);
	const to = join(distDir, rel);
	mkdirSync(dirname(to), { recursive: true });
	cpSync(from, to, { recursive: true });
}