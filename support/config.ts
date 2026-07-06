import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} in .env.e2e`);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

function numberEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${key}: ${raw}`);
  return n;
}

export const config = {
  baseUrl: requireEnv('E2E_BASE_URL'),
  apiUrl: requireEnv('E2E_API_URL'),
  workshopLatitude: numberEnv('E2E_WORKSHOP_LATITUDE', -12.108527),
  workshopLongitude: numberEnv('E2E_WORKSHOP_LONGITUDE', -76.992718),
  workshopCoords: function (): string {
    return `${this.workshopLatitude}, ${this.workshopLongitude}`;
  },
  headless: process.env.E2E_HEADLESS !== 'false',
  slowMo: process.env.E2E_SLOWMO ? Number(process.env.E2E_SLOWMO) : 0,
  recordVideo: process.env.E2E_VIDEO === 'true',
  videoDir: optionalEnv('E2E_VIDEO_DIR') || path.resolve(__dirname, '../artifacts/videos'),
  debug: process.env.E2E_DEBUG === 'true',
  // DB connection for before-suite cleanup
  dbHost: process.env.E2E_DB_HOST || '127.0.0.1',
  dbPort: numberEnv('E2E_DB_PORT', 3306),
  dbName: process.env.E2E_DB_NAME || 'autonexo-database',
  dbUser: process.env.E2E_DB_USER || 'root',
  dbPassword: process.env.E2E_DB_PASSWORD || 'Admin-123',
};
