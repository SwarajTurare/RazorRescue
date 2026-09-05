import { db } from '../database/db.js';

export function logAudit(data) {
  const stmt = db.prepare(`INSERT OR REPLACE INTO recovery_audit
    (id,timestamp,txn_id,customer,phone,amount,gross_margin,failure_reason,action,language,confidence_score,bounce_fee_saved,status,requires_approval,approval_status)
    VALUES (@id,CURRENT_TIMESTAMP,@txn_id,@customer,@phone,@amount,@gross_margin,@failure_reason,@action,@language,@confidence_score,@bounce_fee_saved,@status,@requires_approval,@approval_status)`);
  stmt.run({
    ...data,
    requires_approval: data.requires_approval ? 1 : 0,
    approval_status: data.approval_status || 'Approved',
  });
}

export const getAudits = () => db.prepare('SELECT * FROM recovery_audit ORDER BY timestamp DESC').all();

export function summary() {
  return db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN amount ELSE 0 END),0) AS recovered,
      COALESCE(SUM(bounce_fee_saved),0) AS penalties
    FROM recovery_audit
  `).get();
}
