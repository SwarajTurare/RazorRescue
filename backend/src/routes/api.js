import { Router } from 'express';
import { allTransactions, findTransaction, searchTransactions } from '../repositories/transactions.js';
import { aiPost, aiReport } from '../services/aiClient.js';
import { getAudits, logAudit, summary } from '../services/audit.js';
import { db } from '../database/db.js';
import { isSuppressed, listSuppressed, suppress } from '../services/compliance.js';

export const router = Router();

router.get('/', (req, res) => res.json({
  service: 'razorrescue-backend',
  status: 'ok',
  message: 'API is running. Use /api/health for health checks.'
}));

router.get('/health', (req, res) => res.json({
  ok: true,
  service: 'razorrescue-backend',
  database: 'connected',
  aiService: process.env.AI_SERVICE_URL || 'http://localhost:8001',
}));

router.get('/transactions', (req, res) => {
  const transactions = searchTransactions(String(req.query.q || ''));
  res.json({ transactions, total: transactions.length });
});

router.get('/transactions/:id', (req, res) => {
  const t = findTransaction(req.params.id);
  if (!t) return res.status(404).json({ message: 'Transaction not found' });
  res.json(t);
});

function computeDashboard() {
  const tx = allTransactions();
  const s = summary();
  const risk = tx.reduce((a, b) => a + Number(b.amount || 0), 0);
  const recovered = Number(s.recovered || 0);
  const failures = [...new Set(tx.map(x => x.failure_reason))].map(k => ({
    failure_reason: k,
    amount: tx.filter(x => x.failure_reason === k).reduce((a, b) => a + Number(b.amount || 0), 0),
    count: tx.filter(x => x.failure_reason === k).length,
  }));
  const byDay = getAudits().slice().reverse().reduce((acc, r) => {
    const d = String(r.timestamp || '').slice(0, 10);
    if (!d) return acc;
    const status = String(r.status || '');
    const amount = status === 'Resolved' ? Number(r.amount || 0) : 0;
    acc[d] = (acc[d] || 0) + amount;
    return acc;
  }, {});
  return {
    totalRisk: risk,
    recovered,
    penaltiesSaved: Number(s.penalties || 0),
    recoveryRate: risk ? (recovered / risk) * 100 : 0,
    suppressedCount: listSuppressed().length,
    auditEvents: getAudits().length,
    transactionCount: tx.length,
    failureBreakdown: failures,
    trend: { labels: Object.keys(byDay), values: Object.values(byDay) },
  };
}

router.get('/dashboard/metrics', (req, res) => res.json(computeDashboard()));

function isSuppressedNumber(phone) {
  return isSuppressed(String(phone || ''));
}

router.post('/recovery/triage', async (req, res, next) => {
  try {
    const { transaction, targetLanguage = 'Hinglish', forceDispatch = false, forceApprove = false, simulatedHour = null } = req.body;
    if (!transaction?.transaction_id) return res.status(400).json({ message: 'transaction is required' });
    const suppressed = isSuppressedNumber(transaction.phone);
    const out = await aiPost('/recovery/run', {
      transaction,
      target_lang: targetLanguage,
      is_suppressed: suppressed,
      force_dispatch: forceDispatch,
      force_approve: forceApprove,
      simulated_hour: simulatedHour,
    });
    if (out?.status) {
      logAudit({
        id: `LOG_${Date.now()}_${transaction.transaction_id}`,
        txn_id: transaction.transaction_id,
        customer: transaction.name,
        phone: transaction.phone,
        amount: out.effective_amount ?? transaction.amount,
        gross_margin: transaction.gross_margin,
        failure_reason: out.failure_reason,
        action: out.decision?.action || 'No dispatch',
        language: targetLanguage,
        confidence_score: out.confidence,
        bounce_fee_saved: out.decision?.bounce_fee_saved || 0,
        status: out.status,
        requires_approval: Boolean(out.requires_hitl),
        approval_status: out.requires_hitl ? 'Pending' : 'Approved',
      });
    }
    res.json(out);
  } catch (e) { next(e); }
});

router.post('/recovery/batch', async (req, res, next) => {
  try {
    const tx = allTransactions().slice(0, Math.min(60, Math.max(1, Number(req.body.limit || 60))));
    const results = [];
    const batchSummary = { processed: 0, recovered: 0, queued: 0, suppressed: 0, hitl: 0, failed: 0, penaltiesSaved: 0 };
    const quiet = Boolean(req.body.quietMode);
    const approveAll = Boolean(req.body.approveAll);
    const simHour = req.body.simulateHour ?? (quiet ? 23 : 14);

    for (const transaction of tx) {
      try {
        const out = await aiPost('/recovery/run', {
          transaction,
          target_lang: transaction.preferred_language || 'Hinglish',
          is_suppressed: isSuppressedNumber(transaction.phone),
          force_dispatch: !quiet,
          force_approve: approveAll,
          simulated_hour: simHour,
        });
        const decision = out.decision || {};
        const conf = Number(out.confidence || 0);
        const status = String(out.status || 'Pending');
        const effectiveAmount = Number(out.effective_amount ?? transaction.amount);
        const canConvert = status === 'Ready for Dispatch';
        const conversionProbability = (conf / 100) * 0.65;
        const isWon = canConvert && Math.random() < conversionProbability;

        if (status.includes('Queued')) batchSummary.queued += 1;
        if (status.includes('Suppressed')) batchSummary.suppressed += 1;
        if (status.includes('Awaiting')) batchSummary.hitl += 1;
        batchSummary.penaltiesSaved += Number(decision.bounce_fee_saved || 0);
        if (isWon) batchSummary.recovered += effectiveAmount;

        const finalStatus = isWon ? 'Resolved' : status;
        logAudit({
          id: `LOG_${Date.now()}_${transaction.transaction_id}`,
          txn_id: transaction.transaction_id,
          customer: transaction.name,
          phone: transaction.phone,
          amount: effectiveAmount,
          gross_margin: transaction.gross_margin,
          failure_reason: out.failure_reason || transaction.failure_reason,
          action: decision.action || 'Escalated',
          language: transaction.preferred_language || 'Hinglish',
          confidence_score: conf,
          bounce_fee_saved: Number(decision.bounce_fee_saved || 0),
          status: finalStatus,
          requires_approval: Boolean(out.requires_hitl),
          approval_status: out.requires_hitl && !approveAll ? 'Pending' : 'Approved',
        });

        results.push({ ...out, transaction_id: transaction.transaction_id, name: transaction.name, amount: transaction.amount, final_status: finalStatus });
        batchSummary.processed += 1;
      } catch (error) {
        batchSummary.failed += 1;
        results.push({ transaction_id: transaction.transaction_id, name: transaction.name, amount: transaction.amount, status: 'Failed', error: error.message });
      }
    }

    res.json({ summary: batchSummary, results });
  } catch (e) { next(e); }
});

router.post('/ptp/analyze', async (req, res, next) => {
  try {
    const out = await aiPost('/ptp/analyze', { text: String(req.body.text || '') });
    if (req.body.transactionId && out?.result) {
      const r = out.result;
      db.prepare(`INSERT INTO ptp_events (id, txn_id, text, status, utr_number, promised_date_description, sentiment) VALUES (?,?,?,?,?,?,?)`)
        .run(`PTP_${Date.now()}`, req.body.transactionId, req.body.text, r.status, r.utr_number || null, r.promised_date_description || null, r.sentiment || null);
    }
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/ptp/events', (req, res) => {
  res.json({ events: db.prepare('SELECT * FROM ptp_events ORDER BY created_at DESC').all() });
});

router.post('/compliance/evaluate', async (req, res, next) => {
  try { res.json(await aiPost('/compliance/evaluate', { text: String(req.body.text || '') })); }
  catch (e) { next(e); }
});

router.post('/compliance/suppress', (req, res) => {
  if (!req.body.phone) return res.status(400).json({ message: 'phone is required' });
  suppress(String(req.body.phone), String(req.body.reason || 'Manual opt-out'));
  res.json({ ok: true, phone: String(req.body.phone) });
});

router.get('/compliance/suppression-list', (req, res) => res.json({ numbers: listSuppressed() }));

router.get('/audit', (req, res) => res.json({ rows: getAudits(), total: getAudits().length }));

router.post('/audit/query', (req, res) => {
  const sql = String(req.body.sql || '').trim();
  if (!/^\s*select\b/i.test(sql) || /;|insert|update|delete|drop|alter|attach|pragma|vacuum|create|replace|reindex|transaction/i.test(sql)) {
    return res.status(400).json({ message: 'Only a single read-only SELECT query is allowed.' });
  }
  try { res.json({ rows: db.prepare(sql).all() }); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

router.post('/audit/report', async (req, res, next) => {
  try {
    const audits = getAudits();
    const tx = allTransactions();
    const s = summary();
    const pdf = await aiReport({
      audits,
      total_lost: tx.reduce((a, b) => a + Number(b.amount || 0), 0),
      total_recovered: Number(s.recovered || 0),
      penalties_saved: Number(s.penalties || 0),
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="RazorRescue_Executive_Audit.pdf"');
    res.send(pdf);
  } catch (e) { next(e); }
});

router.post('/voice/synthesize', async (req, res, next) => {
  try { res.json(await aiPost('/voice/synthesize', req.body)); }
  catch (e) { next(e); }
});

// Deterministic, zero-API-call statistical validation matching the original project.
function decisionFor(t) {
  const reason = String(t.failure_reason || '');
  const amount = Number(t.amount || 0);
  const margin = Number(t.gross_margin || 0.4);
  const abandon = Number(t.abandonment_count_30d || 0);
  const overdue = Number(t.days_overdue || 0);
  const attempt = Number(t.attempt_number || 1);
  let hitl = amount >= 25000;
  let discount = 0;
  let split = 1;
  let penalty = 0;
  if (reason === 'insufficient_funds') { if (attempt === 1) penalty = 50; else if (attempt >= 3) hitl = true; }
  else if (reason === 'expired_card') { if (attempt >= 2) hitl = true; }
  else if (reason === 'b2b_overdue') { if (overdue > 8) hitl = true; else if (overdue >= 4) split = 2; }
  else if (reason === 'checkout_abandoned') { if (abandon >= 2) discount = 0; else if (margin >= 0.35 && amount >= 1000) discount = 5; }
  const base = { network_error: 88, auth_timeout: 82, expired_card: 75, checkout_abandoned: 58, insufficient_funds: 50, b2b_overdue: 65 };
  let conf = base[reason] ?? 25;
  if (reason === 'b2b_overdue') conf -= Math.min(35, overdue * 3);
  if ((reason === 'insufficient_funds' || reason === 'expired_card') && attempt > 1) conf -= (attempt - 1) * 10;
  if (abandon >= 2) conf -= 15;
  conf = Math.max(5, Math.min(98, conf));
  return { hitl, discount, split, penalty, conf };
}

router.post('/analytics/monte-carlo', (req, res) => {
  const trials = 20;
  const tx = allTransactions();
  const pool = tx.reduce((a,b)=>a+Number(b.amount||0),0);
  const values = [];
  for (let trial=0; trial<trials; trial++) {
    let recovered=0;
    for (const t of tx) {
      const d=decisionFor(t);
      if (!d.hitl && d.conf >= 30 && Math.random() < (d.conf/100)*0.65) {
        let eff=Number(t.amount||0);
        if (d.discount>0) eff*=1-d.discount/100; else if(d.split===2) eff/=2;
        recovered+=eff;
      }
    }
    values.push(pool ? recovered/pool*100 : 0);
  }
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;
  res.json({trials, values, mean, stdDev:Math.sqrt(variance), min:Math.min(...values), max:Math.max(...values)});
});

router.post('/analytics/benchmark', (req, res) => {
  const includeHitl = Boolean(req.body.includeHitl);
  const trials=30, tx=allTransactions(), naive=[], rr=[], alpha=[];
  const originalRandom=Math.random;
  // Use a simple seeded generator so benchmark is repeatable across runs.
  let seed=42; const rand=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296};
  for(let k=0;k<trials;k++){let ng=0,np=0,rg=0,protect=0; for(const t of tx){const d=decisionFor(t); const high=d.hitl||d.conf<30; if(!includeHitl&&high)continue; const reason=t.failure_reason; const amount=Number(t.amount||0); if(reason==='checkout_abandoned'){const coupon=amount*.10;np+=coupon;if(rand()<.40)ng+=amount-coupon;}else if(reason==='insufficient_funds'){np+=150;if(rand()<.20)ng+=amount;}else if(reason==='b2b_overdue'){if(high)np+=amount*.05;if(rand()<.25)ng+=amount;}else if(rand()<.45)ng+=amount; protect+=d.penalty;if(reason==='checkout_abandoned'&&d.discount===0)protect+=amount*.10; let eff=amount;if(d.discount>0)eff*=1-d.discount/100;else if(d.split===2)eff/=2;const p=d.conf/100*.65;if(rand()<p)rg+=eff;}const n=ng-np,r=rg+protect;naive.push(n);rr.push(r);alpha.push(r-n);}
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length; const sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
  res.json({trials, includeHitl, avgNaiveNet:mean(naive), naiveStd:sd(naive), avgRazorRescueNet:mean(rr), razorRescueStd:sd(rr), avgAlpha:mean(alpha), alphaStd:sd(alpha), winRate:alpha.filter(x=>x>0).length/trials*100});
});

router.post('/roi/calculate', (req, res) => {
  const gmv=Number(req.body.gmv||0), dropPct=Number(req.body.dropPct||0), recoveryPct=Number(req.body.recoveryPct||0);
  const monthlyAtRisk=gmv*dropPct/100, recoveredMonthly=monthlyAtRisk*recoveryPct/100;
  res.json({monthlyAtRisk,recoveredMonthly,annualAtRisk:monthlyAtRisk*12,annualRecovered:recoveredMonthly*12});
});
