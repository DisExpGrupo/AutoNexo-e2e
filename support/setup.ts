import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiClient, ApiError } from './api-client.ts';
import { writeSetupState, type SetupState } from './setup-state.ts';
import { truncateAllTables } from './db-cleanup.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} in .env.e2e`);
  return value;
}

const apiUrl = requireEnv('E2E_API_URL');
const workshopLatitude = Number(requireEnv('E2E_WORKSHOP_LATITUDE'));
const workshopLongitude = Number(requireEnv('E2E_WORKSHOP_LONGITUDE'));
const TEST_PASSWORD = 'E2EPassw0rd!';

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shortUpperCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function logStep(msg: string): void {
  console.log(`[e2e:setup] ${msg}`);
}

async function main(): Promise<void> {
  // Before-suite DB cleanup: guarantees a fresh slate for every E2E run.
  // Do NOT call per-scenario; scenarios are chained and share state.
  await truncateAllTables();

  const runId = randomSuffix();
  const carOwnerEmail = `e2e-carowner-${runId}@test.com`;
  const workshopEmail = `e2e-workshop-${runId}@test.com`;

  const api = new ApiClient(apiUrl);

  logStep(`Registering car owner ${carOwnerEmail}`);
  try {
    await api.signup({
      email: carOwnerEmail,
      password: TEST_PASSWORD,
      firstName: 'E2E',
      lastName: 'CarOwner',
      phoneNumber: '9998887770',
      requestedRole: 'CAR_OWNER',
    });
  } catch (e) {
    if (e instanceof ApiError) throw new Error(`Car owner signup failed: ${e.message}`);
    throw e;
  }

  logStep(`Registering workshop manager ${workshopEmail}`);
  try {
    await api.signup({
      email: workshopEmail,
      password: TEST_PASSWORD,
      firstName: 'E2E',
      lastName: 'Workshop',
      phoneNumber: '9998886660',
      requestedRole: 'WORKSHOP_MANAGER',
    });
  } catch (e) {
    if (e instanceof ApiError) throw new Error(`Workshop manager signup failed: ${e.message}`);
    throw e;
  }

  // Sign in car owner to obtain their userId
  logStep('Signing in car owner (to get userId)');
  const carOwnerSignin = await api.signin({ email: carOwnerEmail, password: TEST_PASSWORD });
  const carOwnerUserId = carOwnerSignin.user.id;

  logStep('Signing in workshop manager');
  const signin1 = await api.signin({ email: workshopEmail, password: TEST_PASSWORD });
  const managerUserId = signin1.user.id;
  const initialToken = signin1.token;

  logStep(`Creating workshop (ownerUserId=${managerUserId})`);
  const workshop = await api.createWorkshop(
    {
      ownerUserId: managerUserId,
      name: 'E2E Testing Workshop',
      shortDescription: 'For E2E Testing',
      legalName: 'TBB S.A.C',
      ruc: '10987654321',
    },
    initialToken,
  );

  logStep(`Re-signing in workshop manager (workshop_id=${workshop.id})`);
  const signin2 = await api.signin({ email: workshopEmail, password: TEST_PASSWORD });
  if (signin2.user.workshopId !== workshop.id) {
    throw new Error(
      `Expected workshopId=${workshop.id} in re-signin response, got ${signin2.user.workshopId}`,
    );
  }
  const workshopToken = signin2.token;

  logStep('Adding workshop location');
  await api.addLocation(
    {
      street: 'Ciclovia San Luis',
      city: 'San Borja',
      state: 'Lima',
      zip: '15037',
      country: 'Peru',
      latitude: workshopLatitude,
      longitude: workshopLongitude,
    },
    workshopToken,
  );

  const templateCode = `E2E-BRAKE-${shortUpperCode()}`;
  const catalogService = 'BRAKE_PAD_REPLACEMENT';
  const customName = 'Cambio de pastillas de freno';

  logStep(`Adding service template ${catalogService}`);
  await api.addServiceTemplate(
    {
      code: templateCode,
      catalogService,
      customName,
      description: 'Reemplazo de pastillas de freno (E2E)',
      estimatedDurationMinutes: 60,
      basePriceAmount: 180,
      currency: 'PEN',
    },
    workshopToken,
  );

  const state: SetupState = {
    carOwner: {
      email: carOwnerEmail,
      password: TEST_PASSWORD,
      userId: carOwnerUserId,
    },
    workshop: {
      managerEmail: workshopEmail,
      managerPassword: TEST_PASSWORD,
      managerUserId,
      id: workshop.id,
      latitude: workshopLatitude,
      longitude: workshopLongitude,
    },
    serviceTemplate: {
      code: templateCode,
      catalogService,
      customName,
    },
    createdAt: new Date().toISOString(),
  };

  writeSetupState(state);
  logStep(`Setup complete. State written. Workshop ID: ${workshop.id}`);
}

main().catch((err) => {
  console.error('[e2e:setup] FAILED:', err.message);
  process.exit(1);
});
