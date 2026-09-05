import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '../..');
const configuredDataDir = path.isAbsolute(env.dataDir)
  ? env.dataDir
  : path.resolve(backendRoot, env.dataDir);
const dbPath = path.join(configuredDataDir, 'recovery_ledger.db');

// Node 22+ / 24+ provides SQLite natively, avoiding native addon binding
// failures that can occur when better-sqlite3 is installed for a different
// Node ABI. The existing recovery_ledger.db schema/data are preserved.
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS recovery_audit (
    id TEXT PRIMARY KEY,
    timestamp DATETIME,
    txn_id TEXT,
    customer TEXT,
    phone TEXT,
    amount REAL,
    gross_margin REAL,
    failure_reason TEXT,
    action TEXT,
    language TEXT,
    confidence_score INTEGER,
    bounce_fee_saved REAL,
    status TEXT,
    requires_approval INTEGER,
    approval_status TEXT
  );
  CREATE TABLE IF NOT EXISTS suppression_registry (
    phone TEXT PRIMARY KEY,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ptp_events (
    id TEXT PRIMARY KEY,
    txn_id TEXT,
    text TEXT,
    status TEXT,
    utr_number TEXT,
    promised_date_description TEXT,
    sentiment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export { dbPath };
