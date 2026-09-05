import { Router } from 'express';

import {
  allTransactions,
  findTransaction,
  searchTransactions,
} from '../repositories/transactions.js';

import {
  aiPost,
  aiReport,
} from '../services/aiClient.js';

import {
  getAudits,
  logAudit,
  summary,
} from '../services/audit.js';

import { db } from '../database/db.js';

import {
  isSuppressed,
  listSuppressed,
  suppress,
} from '../services/compliance.js';


export const router = Router();


/* ============================================================
   ROOT / API STATUS
============================================================ */

router.get('/', (req, res) => {
  res.json({
    service: 'razorrescue-backend',
    status: 'ok',
    message:
      'API is running. Use /api/health for health checks.',
  });
});


/* ============================================================
   HEALTH
============================================================ */

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'razorrescue-backend',
    database: 'connected',
    aiService:
      process.env.AI_SERVICE_URL ||
      'http://localhost:8001',
  });
});


/* ============================================================
   TRANSACTIONS
============================================================ */

router.get('/transactions', (req, res) => {
  try {
    const transactions = searchTransactions(
      String(req.query.q || '')
    );

    res.json({
      transactions,
      total: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error?.message ||
        'Unable to load transactions.',
    });
  }
});


router.get('/transactions/:id', (req, res) => {
  try {
    const transaction = findTransaction(
      req.params.id
    );

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({
      message:
        error?.message ||
        'Unable to load transaction.',
    });
  }
});


/* ============================================================
   DASHBOARD
============================================================ */

function computeDashboard() {
  const transactions = allTransactions();
  const auditSummary = summary();

  const risk = transactions.reduce(
    (total, transaction) =>
      total +
      Number(transaction.amount || 0),
    0
  );

  const recovered = Number(
    auditSummary.recovered || 0
  );

  const failures = [
    ...new Set(
      transactions.map(
        (transaction) =>
          transaction.failure_reason
      )
    ),
  ].map((failureReason) => ({
    failure_reason: failureReason,

    amount: transactions
      .filter(
        (transaction) =>
          transaction.failure_reason ===
          failureReason
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount || 0),
        0
      ),

    count: transactions.filter(
      (transaction) =>
        transaction.failure_reason ===
        failureReason
    ).length,
  }));

  const byDay = getAudits()
    .slice()
    .reverse()
    .reduce((accumulator, row) => {
      const date = String(
        row.timestamp || ''
      ).slice(0, 10);

      if (!date) {
        return accumulator;
      }

      const status = String(
        row.status || ''
      );

      const amount =
        status === 'Resolved'
          ? Number(row.amount || 0)
          : 0;

      accumulator[date] =
        (accumulator[date] || 0) +
        amount;

      return accumulator;
    }, {});

  return {
    totalRisk: risk,

    recovered,

    penaltiesSaved: Number(
      auditSummary.penalties || 0
    ),

    recoveryRate: risk
      ? (recovered / risk) * 100
      : 0,

    suppressedCount:
      listSuppressed().length,

    auditEvents:
      getAudits().length,

    transactionCount:
      transactions.length,

    failureBreakdown: failures,

    trend: {
      labels: Object.keys(byDay),
      values: Object.values(byDay),
    },
  };
}


router.get(
  '/dashboard/metrics',
  (req, res) => {
    try {
      res.json(
        computeDashboard()
      );
    } catch (error) {
      res.status(500).json({
        message:
          error?.message ||
          'Unable to calculate dashboard metrics.',
      });
    }
  }
);


/* ============================================================
   COMPLIANCE HELPER
============================================================ */

function isSuppressedNumber(phone) {
  return isSuppressed(
    String(phone || '')
  );
}


/* ============================================================
   SINGLE TRANSACTION TRIAGE
============================================================ */

router.post(
  '/recovery/triage',
  async (req, res, next) => {
    try {
      const {
        transaction,
        targetLanguage = 'Hinglish',
        forceDispatch = false,
        forceApprove = false,
        simulatedHour = null,
      } = req.body;

      if (
        !transaction?.transaction_id
      ) {
        return res.status(400).json({
          message:
            'transaction is required',
        });
      }

      const suppressed =
        isSuppressedNumber(
          transaction.phone
        );

      const out = await aiPost(
        '/recovery/run',
        {
          transaction,

          target_lang:
            targetLanguage,

          is_suppressed:
            suppressed,

          force_dispatch:
            forceDispatch,

          force_approve:
            forceApprove,

          simulated_hour:
            simulatedHour,
        }
      );

      if (out?.status) {
        logAudit({
          id:
            `LOG_${Date.now()}_${transaction.transaction_id}`,

          txn_id:
            transaction.transaction_id,

          customer:
            transaction.name,

          phone:
            transaction.phone,

          amount:
            out.effective_amount ??
            transaction.amount,

          gross_margin:
            transaction.gross_margin,

          failure_reason:
            out.failure_reason,

          action:
            out.decision?.action ||
            'No dispatch',

          language:
            targetLanguage,

          confidence_score:
            out.confidence,

          bounce_fee_saved:
            out.decision
              ?.bounce_fee_saved ||
            0,

          status:
            out.status,

          requires_approval:
            Boolean(
              out.requires_hitl
            ),

          approval_status:
            out.requires_hitl
              ? 'Pending'
              : 'Approved',
        });
      }

      res.json(out);
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   REGENERATE CUSTOMER COMMUNICATION
============================================================ */

/*
   Used by Triage Studio when the merchant changes:

   - Target language
   - Phone number

   It regenerates:

   - Customer message
   - Localized message
   - Payment/retry URL
   - Spoken message

   It does NOT rerun the complete recovery decision graph.
*/

router.post(
  '/recovery/communication',
  async (req, res, next) => {
    try {
      const {
        transaction,
        targetLanguage = 'Hinglish',
        effectiveAmount,
        decision = {},
        failureReason,
        phone,
      } = req.body;

      if (
        !transaction?.transaction_id
      ) {
        return res.status(400).json({
          message:
            'transaction is required',
        });
      }

      const normalizedPhone =
        String(
          phone ??
          transaction.phone ??
          ''
        ).replace(
          /\D/g,
          ''
        );

      if (
        normalizedPhone.length < 10
      ) {
        return res.status(400).json({
          message:
            'A valid 10-digit phone number is required.',
        });
      }

      const response =
        await aiPost(
          '/recovery/communication',
          {
            transaction: {
              ...transaction,

              phone:
                normalizedPhone.slice(-10),
            },

            target_lang:
              targetLanguage,

            effective_amount:
              Number(
                effectiveAmount ??
                transaction.amount ??
                0
              ),

            decision:
              decision || {},

            failure_reason:
              failureReason ??
              transaction.failure_reason ??
              '',

            phone:
              normalizedPhone.slice(-10),
          }
        );

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   BATCH RECOVERY
============================================================ */

router.post(
  '/recovery/batch',
  async (req, res, next) => {
    try {
      const transactions =
        allTransactions().slice(
          0,
          Math.min(
            60,
            Math.max(
              1,
              Number(
                req.body.limit || 60
              )
            )
          )
        );

      const results = [];

      const batchSummary = {
        processed: 0,
        recovered: 0,
        queued: 0,
        suppressed: 0,
        hitl: 0,
        failed: 0,
        penaltiesSaved: 0,
      };

      const quiet =
        Boolean(
          req.body.quietMode
        );

      const approveAll =
        Boolean(
          req.body.approveAll
        );

      const simulatedHour =
        req.body.simulateHour ??
        (quiet ? 23 : 14);

      for (const transaction of transactions) {
        try {
          const out = await aiPost(
            '/recovery/run',
            {
              transaction,

              target_lang:
                transaction.preferred_language ||
                'Hinglish',

              is_suppressed:
                isSuppressedNumber(
                  transaction.phone
                ),

              force_dispatch:
                !quiet,

              force_approve:
                approveAll,

              simulated_hour:
                simulatedHour,
            }
          );

          const decision =
            out.decision || {};

          const confidence = Number(
            out.confidence || 0
          );

          const status = String(
            out.status || 'Pending'
          );

          const effectiveAmount =
            Number(
              out.effective_amount ??
              transaction.amount
            );

          const canConvert =
            status ===
            'Ready for Dispatch';

          const conversionProbability =
            (confidence / 100) * 0.65;

          const isWon =
            canConvert &&
            Math.random() <
              conversionProbability;

          if (
            status.includes(
              'Queued'
            )
          ) {
            batchSummary.queued +=
              1;
          }

          if (
            status.includes(
              'Suppressed'
            )
          ) {
            batchSummary.suppressed +=
              1;
          }

          if (
            status.includes(
              'Awaiting'
            )
          ) {
            batchSummary.hitl +=
              1;
          }

          batchSummary.penaltiesSaved +=
            Number(
              decision
                .bounce_fee_saved ||
                0
            );

          if (isWon) {
            batchSummary.recovered +=
              effectiveAmount;
          }

          const finalStatus =
            isWon
              ? 'Resolved'
              : status;

          logAudit({
            id:
              `LOG_${Date.now()}_${transaction.transaction_id}`,

            txn_id:
              transaction.transaction_id,

            customer:
              transaction.name,

            phone:
              transaction.phone,

            amount:
              effectiveAmount,

            gross_margin:
              transaction.gross_margin,

            failure_reason:
              out.failure_reason ||
              transaction.failure_reason,

            action:
              decision.action ||
              'Escalated',

            language:
              transaction.preferred_language ||
              'Hinglish',

            confidence_score:
              confidence,

            bounce_fee_saved:
              Number(
                decision
                  .bounce_fee_saved ||
                0
              ),

            status:
              finalStatus,

            requires_approval:
              Boolean(
                out.requires_hitl
              ),

            approval_status:
              out.requires_hitl &&
              !approveAll
                ? 'Pending'
                : 'Approved',
          });

          results.push({
            ...out,

            transaction_id:
              transaction.transaction_id,

            name:
              transaction.name,

            amount:
              transaction.amount,

            final_status:
              finalStatus,
          });

          batchSummary.processed +=
            1;
        } catch (error) {
          batchSummary.failed +=
            1;

          results.push({
            transaction_id:
              transaction.transaction_id,

            name:
              transaction.name,

            amount:
              transaction.amount,

            status: 'Failed',

            error:
              error?.message ||
              'Recovery failed.',
          });
        }
      }

      res.json({
        summary:
          batchSummary,

        results,
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   PROMISE TO PAY
============================================================ */

router.post(
  '/ptp/analyze',
  async (req, res, next) => {
    try {
      const out = await aiPost(
        '/ptp/analyze',
        {
          text: String(
            req.body.text || ''
          ),
        }
      );

      if (
        req.body.transactionId &&
        out?.result
      ) {
        const result =
          out.result;

        db.prepare(
          `
          INSERT INTO ptp_events
          (
            id,
            txn_id,
            text,
            status,
            utr_number,
            promised_date_description,
            sentiment
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          `PTP_${Date.now()}`,

          req.body.transactionId,

          req.body.text,

          result.status,

          result.utr_number ||
            null,

          result.promised_date_description ||
            null,

          result.sentiment ||
            null
        );
      }

      res.json(out);
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/ptp/events',
  (req, res) => {
    try {
      const events = db
        .prepare(
          `
          SELECT *
          FROM ptp_events
          ORDER BY created_at DESC
          `
        )
        .all();

      res.json({
        events,
      });
    } catch (error) {
      res.status(500).json({
        message:
          error?.message ||
          'Unable to load PTP events.',
      });
    }
  }
);


/* ============================================================
   COMPLIANCE
============================================================ */

router.post(
  '/compliance/evaluate',
  async (req, res, next) => {
    try {
      const result =
        await aiPost(
          '/compliance/evaluate',
          {
            text: String(
              req.body.text || ''
            ),
          }
        );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/compliance/suppress',
  (req, res) => {
    if (!req.body.phone) {
      return res.status(400).json({
        message:
          'phone is required',
      });
    }

    const phone = String(
      req.body.phone
    );

    suppress(
      phone,
      String(
        req.body.reason ||
        'Manual opt-out'
      )
    );

    res.json({
      ok: true,
      phone,
    });
  }
);


router.get(
  '/compliance/suppression-list',
  (req, res) => {
    res.json({
      numbers:
        listSuppressed(),
    });
  }
);


/* ============================================================
   AUDIT
============================================================ */

router.get(
  '/audit',
  (req, res) => {
    try {
      const rows =
        getAudits();

      res.json({
        rows,
        total: rows.length,
      });
    } catch (error) {
      res.status(500).json({
        message:
          error?.message ||
          'Unable to load audit ledger.',
      });
    }
  }
);


/* ============================================================
   READ-ONLY SQL ANALYTICS
============================================================ */

router.post(
  '/audit/query',
  (req, res) => {
    const sql = String(
      req.body.sql || ''
    ).trim();

    if (
      !/^\s*select\b/i.test(sql) ||
      /;|insert|update|delete|drop|alter|attach|pragma|vacuum|create|replace|reindex|transaction/i.test(
        sql
      )
    ) {
      return res.status(400).json({
        message:
          'Only a single read-only SELECT query is allowed.',
      });
    }

    try {
      const rows =
        db.prepare(sql).all();

      res.json({
        rows,
      });
    } catch (error) {
      res.status(400).json({
        message:
          error?.message ||
          'SQL query failed.',
      });
    }
  }
);


/* ============================================================
   EXECUTIVE PDF REPORT
============================================================ */

router.post(
  '/audit/report',
  async (req, res, next) => {
    try {
      const audits =
        getAudits();

      const transactions =
        allTransactions();

      const auditSummary =
        summary();

      const pdf =
        await aiReport({
          audits,

          total_lost:
            transactions.reduce(
              (total, transaction) =>
                total +
                Number(
                  transaction.amount ||
                  0
                ),
              0
            ),

          total_recovered:
            Number(
              auditSummary.recovered ||
              0
            ),

          penalties_saved:
            Number(
              auditSummary.penalties ||
              0
            ),
        });

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RazorRescue_Executive_Audit.pdf"'
      );

      res.send(pdf);
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   VOICE
============================================================ */

router.post(
  '/voice/synthesize',
  async (req, res, next) => {
    try {
      const result =
        await aiPost(
          '/voice/synthesize',
          req.body
        );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   DETERMINISTIC DECISION MODEL
   Used by Monte Carlo / Benchmark
============================================================ */

function decisionFor(transaction) {
  const reason = String(
    transaction.failure_reason ||
    ''
  );

  const amount = Number(
    transaction.amount || 0
  );

  const margin = Number(
    transaction.gross_margin ||
    0.4
  );

  const abandonment =
    Number(
      transaction.abandonment_count_30d ||
      0
    );

  const overdue =
    Number(
      transaction.days_overdue ||
      0
    );

  const attempt =
    Number(
      transaction.attempt_number ||
      1
    );

  let hitl =
    amount >= 25000;

  let discount = 0;

  let split = 1;

  let penalty = 0;

  if (
    reason ===
    'insufficient_funds'
  ) {
    if (attempt === 1) {
      penalty = 50;
    } else if (attempt >= 3) {
      hitl = true;
    }
  } else if (
    reason ===
    'expired_card'
  ) {
    if (attempt >= 2) {
      hitl = true;
    }
  } else if (
    reason ===
    'b2b_overdue'
  ) {
    if (overdue > 8) {
      hitl = true;
    } else if (overdue >= 4) {
      split = 2;
    }
  } else if (
    reason ===
    'checkout_abandoned'
  ) {
    if (abandonment >= 2) {
      discount = 0;
    } else if (
      margin >= 0.35 &&
      amount >= 1000
    ) {
      discount = 5;
    }
  }

  const baseScores = {
    network_error: 88,
    auth_timeout: 82,
    expired_card: 75,
    checkout_abandoned: 58,
    insufficient_funds: 50,
    b2b_overdue: 65,
  };

  let confidence =
    baseScores[reason] ??
    25;

  if (
    reason ===
    'b2b_overdue'
  ) {
    confidence -= Math.min(
      35,
      overdue * 3
    );
  }

  if (
    (
      reason ===
      'insufficient_funds' ||
      reason ===
      'expired_card'
    ) &&
    attempt > 1
  ) {
    confidence -=
      (attempt - 1) * 10;
  }

  if (
    abandonment >= 2
  ) {
    confidence -= 15;
  }

  confidence =
    Math.max(
      5,
      Math.min(
        98,
        confidence
      )
    );

  return {
    hitl,
    discount,
    split,
    penalty,
    conf: confidence,
  };
}


/* ============================================================
   MONTE CARLO
============================================================ */

router.post(
  '/analytics/monte-carlo',
  (req, res) => {
    const trials = 20;

    const transactions =
      allTransactions();

    const totalPool =
      transactions.reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.amount ||
            0
          ),
        0
      );

    const values = [];

    for (
      let trial = 0;
      trial < trials;
      trial++
    ) {
      let recovered = 0;

      for (
        const transaction of
        transactions
      ) {
        const decision =
          decisionFor(
            transaction
          );

        if (
          !decision.hitl &&
          decision.conf >= 30 &&
          Math.random() <
            (decision.conf / 100) *
              0.65
        ) {
          let effectiveAmount =
            Number(
              transaction.amount ||
              0
            );

          if (
            decision.discount >
            0
          ) {
            effectiveAmount *=
              1 -
              decision.discount /
                100;
          } else if (
            decision.split === 2
          ) {
            effectiveAmount /=
              2;
          }

          recovered +=
            effectiveAmount;
        }
      }

      values.push(
        totalPool
          ? (recovered /
              totalPool) *
              100
          : 0
      );
    }

    const mean =
      values.reduce(
        (a, b) =>
          a + b,
        0
      ) / values.length;

    const variance =
      values.reduce(
        (a, b) =>
          a +
          (b - mean) **
            2,
        0
      ) / values.length;

    res.json({
      trials,
      values,
      mean,
      stdDev:
        Math.sqrt(
          variance
        ),
      min:
        Math.min(
          ...values
        ),
      max:
        Math.max(
          ...values
        ),
    });
  }
);


/* ============================================================
   NAIVE VS RAZORRESCUE BENCHMARK
============================================================ */

router.post(
  '/analytics/benchmark',
  (req, res) => {
    const includeHitl =
      Boolean(
        req.body.includeHitl
      );

    const trials = 30;

    const transactions =
      allTransactions();

    const naive = [];
    const razorRescue = [];
    const alpha = [];

    let seed = 42;

    const rand = () => {
      seed =
        (
          seed *
            1664525 +
          1013904223
        ) >>> 0;

      return (
        seed /
        4294967296
      );
    };

    for (
      let trial = 0;
      trial < trials;
      trial++
    ) {
      let naiveGross = 0;
      let naiveProtection = 0;

      let rrRecovered = 0;
      let protection = 0;

      for (
        const transaction of
        transactions
      ) {
        const decision =
          decisionFor(
            transaction
          );

        const highRisk =
          decision.hitl ||
          decision.conf < 30;

        if (
          !includeHitl &&
          highRisk
        ) {
          continue;
        }

        const reason =
          transaction.failure_reason;

        const amount =
          Number(
            transaction.amount ||
            0
          );

        if (
          reason ===
          'checkout_abandoned'
        ) {
          const coupon =
            amount * 0.1;

          naiveProtection +=
            coupon;

          if (
            rand() < 0.40
          ) {
            naiveGross +=
              amount -
              coupon;
          }
        } else if (
          reason ===
          'insufficient_funds'
        ) {
          naiveProtection +=
            150;

          if (
            rand() < 0.20
          ) {
            naiveGross +=
              amount;
          }
        } else if (
          reason ===
          'b2b_overdue'
        ) {
          if (highRisk) {
            naiveProtection +=
              amount * 0.05;
          }

          if (
            rand() < 0.25
          ) {
            naiveGross +=
              amount;
          }
        } else if (
          rand() < 0.45
        ) {
          naiveGross +=
            amount;
        }

        protection +=
          decision.penalty;

        if (
          reason ===
            'checkout_abandoned' &&
          decision.discount ===
            0
        ) {
          protection +=
            amount * 0.10;
        }

        let effectiveAmount =
          amount;

        if (
          decision.discount >
          0
        ) {
          effectiveAmount *=
            1 -
            decision.discount /
              100;
        } else if (
          decision.split ===
          2
        ) {
          effectiveAmount /=
            2;
        }

        const probability =
          (decision.conf /
            100) *
          0.65;

        if (
          rand() <
          probability
        ) {
          rrRecovered +=
            effectiveAmount;
        }
      }

      const naiveNet =
        naiveGross -
        naiveProtection;

      const razorRescueNet =
        rrRecovered +
        protection;

      const difference =
        razorRescueNet -
        naiveNet;

      naive.push(
        naiveNet
      );

      razorRescue.push(
        razorRescueNet
      );

      alpha.push(
        difference
      );
    }

    const mean = (values) => {
      if (!values.length) {
        return 0;
      }

      return (
        values.reduce(
          (a, b) =>
            a + b,
          0
        ) /
        values.length
      );
    };

    const standardDeviation =
      (values) => {
        if (!values.length) {
          return 0;
        }

        const average =
          mean(values);

        return Math.sqrt(
          values.reduce(
            (total, value) =>
              total +
              (
                value -
                average
              ) ** 2,
            0
          ) /
            values.length
        );
      };

    res.json({
      trials,

      includeHitl,

      avgNaiveNet:
        mean(naive),

      naiveStd:
        standardDeviation(
          naive
        ),

      avgRazorRescueNet:
        mean(razorRescue),

      razorRescueStd:
        standardDeviation(
          razorRescue
        ),

      avgAlpha:
        mean(alpha),

      alphaStd:
        standardDeviation(
          alpha
        ),

      winRate:
        alpha.filter(
          (value) =>
            value > 0
        ).length /
        trials *
        100,
    });
  }
);


/* ============================================================
   ROI
============================================================ */

router.post(
  '/roi/calculate',
  (req, res) => {
    const gmv =
      Number(
        req.body.gmv || 0
      );

    const dropPct =
      Number(
        req.body.dropPct || 0
      );

    const recoveryPct =
      Number(
        req.body.recoveryPct ||
        0
      );

    const monthlyAtRisk =
      (gmv * dropPct) /
      100;

    const recoveredMonthly =
      (
        monthlyAtRisk *
        recoveryPct
      ) / 100;

    res.json({
      monthlyAtRisk,

      recoveredMonthly,

      annualAtRisk:
        monthlyAtRisk *
        12,

      annualRecovered:
        recoveredMonthly *
        12,
    });
  }
);