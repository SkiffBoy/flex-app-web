/**
 * 跨仓复制 plugin-demo 前端产物到后端 JAR 资源目录（spec §7.5 T1）。
 * 用法：node scripts/copy-to-backend.mjs
 * 环境变量：FLEX_BACKEND_DIR（后端仓根目录，未设则 fallback 相对路径）
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(__dirname, '../dist');

if (!existsSync(FRONTEND)) {
  // oxlint 要求 throw 而非 console.error + exit
  throw new Error('dist/ 不存在，请先运行 pnpm build');
}

const BACKEND_ROOT =
  process.env.FLEX_BACKEND_DIR ?? resolve(__dirname, '../../../../flex-app');
const BACKEND = resolve(
  BACKEND_ROOT,
  'backend/flex-plugin-demo/src/main/resources/static/plugin-demo',
);

mkdirSync(BACKEND, { recursive: true });
cpSync(FRONTEND, BACKEND, { recursive: true });
// oxlint 只允许 console.warn/error，用 warn 输出成功信息
console.warn(`✓ 已复制 plugin-demo 前端产物到：\n  ${BACKEND}`);
