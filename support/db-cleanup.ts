import mysql from 'mysql2/promise';
import { config } from './config.ts';

/**
 * Truncates all transactional (user data) tables in the configured MySQL database.
 * Excludes reference/seed tables (vehicle_brands, vehicle_models, roles) because
 * they are populated once at application startup by CommandLineRunner beans
 * and never modified during E2E. Truncating them would break the running backend.
 * Also excludes Flyway's schema history table if present.
 * Intended to be called once per E2E run (before-suite), not per scenario,
 * because scenarios are chained and depend on shared state.
 */
export async function truncateAllTables(): Promise<void> {
  const connection = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    multipleStatements: true,
  });

  try {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_type = 'BASE TABLE'
         AND table_name != 'flyway_schema_history'
          AND table_name NOT IN ('vehicle_brands', 'vehicle_models', 'roles')`
    );

    const tableNames = rows.map((r) => (r.TABLE_NAME ?? r.table_name) as string);

    if (tableNames.length === 0) {
      console.log('[e2e:db-cleanup] No tables found to truncate.');
      return;
    }

    console.log(`[e2e:db-cleanup] Truncating ${tableNames.length} table(s): ${tableNames.join(', ')}`);

    const truncateStatements = tableNames.map((t) => `TRUNCATE TABLE \`${t}\`;`).join('\n');
    await connection.query(`SET FOREIGN_KEY_CHECKS = 0;\n${truncateStatements}\nSET FOREIGN_KEY_CHECKS = 1;`);

    console.log('[e2e:db-cleanup] Truncate complete.');
  } finally {
    await connection.end();
  }
}
