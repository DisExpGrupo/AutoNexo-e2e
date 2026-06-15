import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SETUP_STATE_PATH = path.resolve(__dirname, '../.e2e-setup.json');

export interface SetupState {
  carOwner: {
    email: string;
    password: string;
    userId: number;
  };
  workshop: {
    managerEmail: string;
    managerPassword: string;
    managerUserId: number;
    id: number;
    latitude: number;
    longitude: number;
  };
  serviceTemplate: {
    code: string;
    catalogService: string;
    customName: string;
  };
  createdAt: string;
}

export function writeSetupState(state: SetupState): void {
  fs.writeFileSync(SETUP_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

export function readSetupState(): SetupState {
  if (!fs.existsSync(SETUP_STATE_PATH)) {
    throw new Error(
      `Setup state file not found at ${SETUP_STATE_PATH}. Run \`pnpm e2e:setup\` first.`,
    );
  }
  const raw = fs.readFileSync(SETUP_STATE_PATH, 'utf-8');
  return JSON.parse(raw) as SetupState;
}

export function setupStateExists(): boolean {
  return fs.existsSync(SETUP_STATE_PATH);
}
