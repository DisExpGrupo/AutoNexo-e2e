import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { ApiClient, ApiError } from './api-client.ts';
import { writeSetupState, type SetupState } from './setup-state.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} in .env.e2e`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const apiUrl = requireEnv('E2E_API_URL');
const workshopLatitude = Number(requireEnv('E2E_WORKSHOP_LATITUDE'));
const workshopLongitude = Number(requireEnv('E2E_WORKSHOP_LONGITUDE'));
const TEST_PASSWORD = 'E2EPassw0rd!';

const dbHost = optionalEnv('E2E_DB_HOST', '127.0.0.1');
const dbPort = Number(optionalEnv('E2E_DB_PORT', '3306'));
const dbUser = optionalEnv('E2E_DB_USER', 'root');
const dbPass = optionalEnv('E2E_DB_PASS', 'Admin-123');
const dbName = optionalEnv('E2E_DB_NAME', 'autonexo-database');

async function cleanupE2eData(): Promise<void> {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost, port: dbPort, user: dbUser, password: dbPass, database: dbName,
    });
    logStep('Cleaning up old e2e data from database');
    await connection.execute('DELETE FROM service_request_matches');
    await connection.execute('DELETE FROM match_services');
    await connection.execute('DELETE FROM offers');
    await connection.execute('DELETE FROM service_booking_services');
    await connection.execute('DELETE FROM service_bookings');
    await connection.execute('DELETE FROM service_requested_services');
    await connection.execute('DELETE FROM service_requests');
    await connection.execute('DELETE FROM service_performeds');
    await connection.execute('DELETE FROM maintenance_image_urls');
    await connection.execute('DELETE FROM maintenances');
    await connection.execute('DELETE FROM location_opening_hours');
    await connection.execute(
      `DELETE FROM locations WHERE workshop_id IN (SELECT w.id FROM workshops w INNER JOIN iam_workshop_references r ON w.id = r.workshop_id INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e-%')`,
    );
    await connection.execute(
      `DELETE st FROM service_templates st INNER JOIN workshops w ON st.workshop_id = w.id INNER JOIN iam_workshop_references r ON w.id = r.workshop_id INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e-%'`,
    );
    await connection.execute(
      `DELETE w FROM workshops w INNER JOIN iam_workshop_references r ON w.id = r.workshop_id INNER JOIN users u ON r.user_id = u.id WHERE u.email LIKE 'e2e-%'`,
    );
    await connection.execute(
      `DELETE v FROM vehicles v WHERE v.primary_owner_id IN (SELECT u.id FROM users u WHERE u.email LIKE 'e2e-%')`,
    );
    await connection.execute("DELETE FROM users WHERE email LIKE 'e2e-%'");
    await connection.execute('DELETE FROM locations WHERE workshop_id IN (SELECT w.id FROM workshops w WHERE w.name = ?)', ['E2E Testing Workshop']);
    await connection.execute('DELETE FROM service_templates WHERE workshop_id IN (SELECT w.id FROM workshops w WHERE w.name = ?)', ['E2E Testing Workshop']);
    await connection.execute('DELETE FROM workshops WHERE name = ?', ['E2E Testing Workshop']);
    logStep('Database cleanup complete');
  } catch (err: any) {
    logStep(`Database cleanup skipped (error: ${err.message})`);
  } finally {
    if (connection) await connection.end();
  }
}

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
  await cleanupE2eData();

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
