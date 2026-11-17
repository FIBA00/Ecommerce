// tests/e2e/helpers/env.mjs
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
export const WORKSPACE_ROOT = resolve(__dirname, '../../..');

export const API_BASE_URL = (
  process.env.API_BASE_URL ||
  process.env.API_URL ||
  'http://localhost:3001/api'
).replace(/\/+$/, '');

export const FRONTEND_DIR = process.env.FRONTEND_DIR || join(WORKSPACE_ROOT, 'frontend');
export const BACKEND_DIR = process.env.BACKEND_DIR || join(WORKSPACE_ROOT, 'backend');
export const DOCS_DIR = process.env.DOCS_DIR || join(WORKSPACE_ROOT, 'docs');

export const DEFAULT_TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);
export const HEALTH_MAX_RETRIES = Number(process.env.HEALTH_RETRIES || 15);
export const HEALTH_RETRY_INTERVAL_MS = Number(process.env.HEALTH_INTERVAL || 1000);

// Poll backend API until alive or timeout
export async function waitForApi(maxRetries = HEALTH_MAX_RETRIES, intervalMs = HEALTH_RETRY_INTERVAL_MS) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {
      // Backend not yet responding
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
