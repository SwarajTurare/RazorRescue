import { useEffect, useState } from 'react';

import {
  Download,
  Database,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

import { api } from '../services/api';
import { toast } from 'react-toastify';

import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';


/* ============================================================
   DEFAULT QUERY
============================================================ */

const DEFAULT_SQL = `
SELECT
  failure_reason,
  COUNT(*) AS total_events,
  SUM(amount) AS total_at_risk,
  SUM(bounce_fee_saved) AS fees_saved
FROM recovery_audit
GROUP BY 1
`.trim();


export default function AuditLedger() {
  const [rows, setRows] = useState([]);

  const [sql, setSql] =
    useState(DEFAULT_SQL);

  const [query, setQuery] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [queryLoading, setQueryLoading] =
    useState(false);

  const [reportLoading, setReportLoading] =
    useState(false);


  /* ============================================================
     HIDE PAGE SCROLLBAR ONLY ON AUDIT LEDGER
     
     The page remains scrollable when necessary, but the browser
     scrollbar itself is hidden. The audit history gets its own
     visible custom scrollbar.
  ============================================================ */

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add(
      'audit-ledger-page'
    );

    body.classList.add(
      'audit-ledger-page'
    );

    return () => {
      html.classList.remove(
        'audit-ledger-page'
      );

      body.classList.remove(
        'audit-ledger-page'
      );
    };
  }, []);


  /* ============================================================
     LOAD AUDIT HISTORY
  ============================================================ */

  const loadAudit = async (
    showToast = false
  ) => {
    try {
      setLoading(true);

      const response =
        await api.audit();

      const auditRows =
        Array.isArray(
          response?.rows
        )
          ? response.rows
          : [];

      setRows(auditRows);

      if (showToast) {
        toast.success(
          'Audit history refreshed'
        );
      }
    } catch (error) {
      console.error(
        'Audit history error:',
        error
      );

      setRows([]);

      toast.error(
        error?.message ||
        'Unable to load audit history'
      );
    } finally {
      setLoading(false);
    }
  };


  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadAudit();
  }, []);


  /* ============================================================
     READ-ONLY SQL QUERY
  ============================================================ */

  const runQuery = async () => {
    const statement =
      sql.trim();

    if (!statement) {
      toast.warning(
        'Enter a SQL query first'
      );
      return;
    }

    const normalized =
      statement
        .trim()
        .toLowerCase();

    if (
      !normalized.startsWith(
        'select'
      ) &&
      !normalized.startsWith(
        'with'
      )
    ) {
      toast.error(
        'Only read-only SELECT or WITH queries are allowed.'
      );
      return;
    }

    try {
      setQueryLoading(true);

      const response =
        await api.auditQuery(
          statement
        );

      setQuery(
        response || {
          rows: [],
        }
      );

      toast.success(
        'Read-only analytics query complete'
      );
    } catch (error) {
      console.error(
        'Analytics query error:',
        error
      );

      setQuery(null);

      toast.error(
        error?.message ||
        'Analytics query failed'
      );
    } finally {
      setQueryLoading(false);
    }
  };


  /* ============================================================
     EXPORT PDF
  ============================================================ */

  const exportReport = async () => {
    try {
      setReportLoading(true);

      const blob =
        await api.report();

      if (
        !blob ||
        !(blob instanceof Blob)
      ) {
        throw new Error(
          'The server did not return a valid PDF file.'
        );
      }

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href = url;

      anchor.download =
        'RazorRescue_Executive_Audit.pdf';

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      toast.success(
        'Audit report generated'
      );
    } catch (error) {
      console.error(
        'PDF export error:',
        error
      );

      toast.error(
        error?.message ||
        'Unable to generate audit report'
      );
    } finally {
      setReportLoading(false);
    }
  };


  /* ============================================================
     FORMAT HELPERS
  ============================================================ */

  const formatAmount = (
    value
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return '₹0';
    }

    return `₹${number.toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    )}`;
  };


  const formatConfidence = (
    value
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return '—';
    }

    return `${number}%`;
  };


  return (
    <>
      {/* ======================================================
          PAGE-SCOPED SCROLLBAR STYLING
          
          Browser/page scrollbar:
          hidden only while this page is mounted.

          Audit history scrollbar:
          visible, custom styled and scrollable.
      ======================================================= */}

      <style>
        {`
          /* ==================================================
             HIDE MAIN PAGE SCROLLBAR
          =================================================== */

          html.audit-ledger-page,
          body.audit-ledger-page {
            scrollbar-width: none;
          }

          html.audit-ledger-page::-webkit-scrollbar,
          body.audit-ledger-page::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }


          /* ==================================================
             AUDIT HISTORY CUSTOM SCROLLBAR
          =================================================== */

          .audit-history-scroll {
            scrollbar-width: thin;

            scrollbar-color:
              rgba(217, 163, 83, 0.70)
              rgba(70, 58, 49, 0.35);

            overscroll-behavior: contain;

            scrollbar-gutter: stable;
          }


          .audit-history-scroll::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }


          .audit-history-scroll::-webkit-scrollbar-track {
            background:
              rgba(20, 16, 11, 0.92);

            border-left:
              1px solid
              rgba(70, 58, 49, 0.45);

            border-top:
              1px solid
              rgba(70, 58, 49, 0.35);

            border-radius: 999px;
          }


          .audit-history-scroll::-webkit-scrollbar-thumb {
            background:
              linear-gradient(
                180deg,
                rgba(231, 185, 106, 0.78),
                rgba(184, 116, 54, 0.78)
              );

            border:
              2px solid
              rgba(20, 16, 11, 0.92);

            border-radius: 999px;

            min-height: 42px;
          }


          .audit-history-scroll::-webkit-scrollbar-thumb:hover {
            background:
              linear-gradient(
                180deg,
                rgba(240, 201, 120, 0.95),
                rgba(217, 163, 83, 0.95)
              );
          }


          .audit-history-scroll::-webkit-scrollbar-corner {
            background:
              rgba(20, 16, 11, 0.92);
          }


          /* ==================================================
             QUERY RESULT SCROLLBAR
          =================================================== */

          .audit-query-scroll {
            scrollbar-width: thin;

            scrollbar-color:
              rgba(217, 163, 83, 0.55)
              rgba(70, 58, 49, 0.30);
          }


          .audit-query-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }


          .audit-query-scroll::-webkit-scrollbar-track {
            background:
              rgba(20, 16, 11, 0.75);

            border-radius: 999px;
          }


          .audit-query-scroll::-webkit-scrollbar-thumb {
            background:
              rgba(217, 163, 83, 0.62);

            border-radius: 999px;

            border:
              2px solid
              rgba(20, 16, 11, 0.75);
          }


          .audit-query-scroll::-webkit-scrollbar-thumb:hover {
            background:
              rgba(231, 185, 106, 0.85);
          }


          /* ==================================================
             MOBILE
          =================================================== */

          @media (max-width: 640px) {

            .audit-history-scroll::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

          }
        `}
      </style>


      {/* ======================================================
          PAGE
      ======================================================= */}

      <div
        className="
          w-full
          min-w-0
        "
      >

        {/* ====================================================
            PAGE HEADER
        ===================================================== */}

        <SectionHeader
          eyebrow="Governance"
          title="Audit ledger & reporting"
          description="Inspect persistent recovery events, run validated read-only analytics, and export the executive audit report."
          action={
            <button
              type="button"
              onClick={exportReport}
              disabled={reportLoading}
              className="
                inline-flex
                items-center
                justify-center
                gap-2

                rounded-xl

                border
                border-rr-border

                bg-rr-surface

                px-4
                py-2.5

                text-sm
                font-medium
                text-rr-text

                transition-all
                duration-300

                hover:border-rr-gold/40
                hover:bg-rr-gold/[.04]

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rr-gold

                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >

              {reportLoading ? (
                <RefreshCw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Download size={16} />
              )}

              {reportLoading
                ? 'Generating...'
                : 'Export PDF'}

            </button>
          }
        />


        {/* ====================================================
            MAIN GRID
        ===================================================== */}

        <div
          className="
            grid
            w-full
            min-w-0
            gap-4

            lg:grid-cols-[minmax(320px,.9fr)_minmax(0,1.1fr)]
          "
        >

          {/* ==================================================
              SQL ANALYTICS
          =================================================== */}

          <section
            className="
              rr-surface
              rr-glow

              min-w-0

              rounded-2xl

              p-4
              sm:p-5
            "
          >

            {/* Header */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <Database
                  size={17}
                  className="text-rr-gold"
                />

                <h2
                  className="
                    text-sm
                    font-semibold
                    text-rr-text
                  "
                >
                  Read-only SQL analytics
                </h2>
              </div>


              <div
                className="
                  flex
                  items-center
                  gap-1.5

                  rounded-full

                  border
                  border-green-400/15

                  bg-green-400/[.04]

                  px-2.5
                  py-1

                  text-[10px]
                  text-green-300
                "
              >
                <ShieldCheck
                  size={12}
                />

                READ ONLY
              </div>

            </div>


            <p
              className="
                mt-2
                text-xs
                leading-5
                text-rr-dim
              "
            >
              Run validated SELECT/WITH statements against the
              recovery audit data.
            </p>


            {/* SQL EDITOR */}

            <textarea
              rows={9}
              value={sql}
              onChange={(event) =>
                setSql(
                  event.target.value
                )
              }
              spellCheck={false}
              className="
                mt-4

                w-full
                min-w-0

                resize-y

                rounded-xl

                border
                border-rr-border

                bg-rr-bg

                p-3

                font-mono
                text-xs
                leading-5
                text-rr-text

                outline-none

                transition

                focus:border-rr-gold/50
                focus:ring-1
                focus:ring-rr-gold/20
              "
            />


            {/* QUERY ACTIONS */}

            <div
              className="
                mt-3
                flex
                flex-col
                gap-2

                sm:flex-row
              "
            >

              <button
                type="button"
                onClick={runQuery}
                disabled={
                  queryLoading ||
                  !sql.trim()
                }
                className="
                  inline-flex

                  flex-1

                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-rr-gold

                  px-4
                  py-2.5

                  text-xs
                  font-semibold
                  text-rr-bg

                  transition-all
                  duration-300

                  hover:bg-rr-goldBright

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                {queryLoading ? (
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <FileSearch
                    size={14}
                  />
                )}

                {queryLoading
                  ? 'Running query...'
                  : 'Run validated query'}

              </button>


              <button
                type="button"
                onClick={() =>
                  setSql(DEFAULT_SQL)
                }
                className="
                  rounded-xl

                  border
                  border-rr-border

                  px-4
                  py-2.5

                  text-xs
                  text-rr-muted

                  transition

                  hover:border-rr-gold/40
                  hover:text-rr-text
                "
              >
                Reset query
              </button>

            </div>


            {/* QUERY RESULT */}

            {query && (
              <div className="mt-4">

                <div
                  className="
                    mb-2
                    flex
                    items-center
                    justify-between
                    gap-2
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2

                      text-xs
                      font-medium
                      text-rr-muted
                    "
                  >
                    <BarChart3
                      size={14}
                      className="text-rr-gold"
                    />

                    Query result
                  </div>


                  <span
                    className="
                      shrink-0
                      text-[10px]
                      text-rr-dim
                    "
                  >
                    {Array.isArray(
                      query?.rows
                    )
                      ? query.rows.length
                      : 0}{' '}
                    rows
                  </span>

                </div>


                <pre
                  className="
                    audit-query-scroll

                    max-h-80

                    overflow-auto

                    rounded-xl

                    border
                    border-rr-border

                    bg-rr-bg

                    p-3

                    text-[11px]
                    leading-5
                    text-rr-muted
                  "
                >
                  {JSON.stringify(
                    query?.rows ||
                      [],
                    null,
                    2
                  )}
                </pre>

              </div>
            )}


            {/* INFORMATION */}

            <div
              className="
                mt-4

                flex
                items-start
                gap-2

                rounded-xl

                border
                border-rr-border/60

                bg-rr-gold/[.025]

                p-3
              "
            >

              <AlertCircle
                size={14}
                className="
                  mt-0.5
                  shrink-0
                  text-rr-gold
                "
              />

              <p
                className="
                  text-[11px]
                  leading-5
                  text-rr-dim
                "
              >
                Analytics queries are intended for inspection
                only. Write, update, delete and schema-changing
                operations are blocked by the read-only backend
                workflow.
              </p>

            </div>

          </section>


          {/* ==================================================
              AUDIT HISTORY
          =================================================== */}

          <section
            className="
              rr-surface
              rr-glow

              min-w-0

              overflow-hidden

              rounded-2xl
            "
          >

            {/* =================================================
                AUDIT HEADER
            ================================================== */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3

                border-b
                border-rr-border/70

                px-4
                py-4

                sm:px-5
              "
            >

              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Database
                    size={16}
                    className="text-rr-gold"
                  />

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-rr-text
                    "
                  >
                    Audit history
                  </h2>
                </div>

                <p
                  className="
                    mt-1
                    text-xs
                    text-rr-dim
                  "
                >
                  {rows.length} persisted event
                  {rows.length === 1
                    ? ''
                    : 's'}
                </p>

              </div>


              {/* Refresh */}

              <button
                type="button"
                onClick={() =>
                  loadAudit(true)
                }
                disabled={loading}
                className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-2

                  rounded-lg

                  border
                  border-rr-border

                  px-3
                  py-2

                  text-xs
                  text-rr-muted

                  transition-all

                  hover:border-rr-gold/40
                  hover:bg-rr-gold/[.04]
                  hover:text-rr-text

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <RefreshCw
                  size={13}
                  className={
                    loading
                      ? 'animate-spin'
                      : ''
                  }
                />

                Refresh

              </button>

            </div>


            {/* =================================================
                CUSTOM SCROLL CONTAINER

                IMPORTANT:
                - Horizontal scroll stays INSIDE this box
                - Vertical scroll stays INSIDE this box
                - Page scrollbar is hidden
            ================================================== */}

            <div
              className="
                audit-history-scroll

                max-h-[620px]

                overflow-x-auto
                overflow-y-auto

                overscroll-contain

                bg-rr-bg/20
              "
            >

              {loading ? (
                <div
                  className="
                    flex
                    min-h-[400px]
                    items-center
                    justify-center

                    text-xs
                    text-rr-dim
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />

                    Loading audit history...

                  </div>

                </div>
              ) : rows.length > 0 ? (

                <table
                  className="
                    w-full
                    min-w-[1050px]

                    border-separate
                    border-spacing-0

                    text-left
                    text-xs
                  "
                >

                  {/* =========================================
                      TABLE HEAD
                  ========================================== */}

                  <thead
                    className="
                      sticky
                      top-0
                      z-20

                      bg-[#17130F]

                      text-rr-dim
                    "
                  >

                    <tr>

                      {[
                        'Time',
                        'Transaction',
                        'Customer',
                        'Amount',
                        'Reason',
                        'Action',
                        'Confidence',
                        'Status',
                      ].map(
                        (heading) => (
                          <th
                            key={
                              heading
                            }
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/70

                              bg-[#17130F]

                              px-4
                              py-3

                              font-medium
                            "
                          >
                            {heading}
                          </th>
                        )
                      )}

                    </tr>

                  </thead>


                  {/* =========================================
                      TABLE BODY
                  ========================================== */}

                  <tbody>

                    {rows.map(
                      (
                        row,
                        index
                      ) => (
                        <tr
                          key={
                            row.id ??
                            row.txn_id ??
                            index
                          }
                          className="
                            transition

                            hover:bg-rr-gold/[.025]
                          "
                        >

                          {/* Time */}

                          <td
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              text-rr-dim
                            "
                          >
                            {row.timestamp ||
                              '—'}
                          </td>


                          {/* Transaction */}

                          <td
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              font-mono

                              text-rr-text
                            "
                          >
                            {row.txn_id ||
                              '—'}
                          </td>


                          {/* Customer */}

                          <td
                            className="
                              min-w-[140px]

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              text-rr-muted
                            "
                          >
                            {row.customer ||
                              '—'}
                          </td>


                          {/* Amount */}

                          <td
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              font-medium

                              text-rr-text
                            "
                          >
                            {formatAmount(
                              row.amount
                            )}
                          </td>


                          {/* Reason */}

                          <td
                            className="
                              min-w-[180px]
                              max-w-[220px]

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              text-rr-muted
                            "
                          >
                            <span className="break-words">
                              {row.failure_reason ||
                                '—'}
                            </span>
                          </td>


                          {/* Action */}

                          <td
                            className="
                              min-w-[220px]
                              max-w-[280px]

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              text-rr-muted
                            "
                          >
                            <span className="break-words">
                              {row.action ||
                                '—'}
                            </span>
                          </td>


                          {/* Confidence */}

                          <td
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/40

                              px-4
                              py-4

                              text-rr-text
                            "
                          >
                            {formatConfidence(
                              row.confidence_score
                            )}
                          </td>


                          {/* Status */}

                          <td
                            className="
                              whitespace-nowrap

                              border-b
                              border-rr-border/40

                              px-4
                              py-4
                            "
                          >

                            <StatusBadge
                              tone={
                                String(
                                  row.status ||
                                    ''
                                )
                                  .toLowerCase()
                                  .includes(
                                    'ready'
                                  )
                                  ? 'success'
                                  : String(
                                      row.status ||
                                        ''
                                    )
                                      .toLowerCase()
                                      .includes(
                                        'suppress'
                                      )
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {row.status ||
                                'Unknown'}
                            </StatusBadge>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              ) : (

                /* =========================================
                   EMPTY STATE
                ========================================== */

                <div
                  className="
                    flex
                    min-h-[400px]

                    flex-col
                    items-center
                    justify-center

                    p-6

                    text-center
                  "
                >

                  <Database
                    size={30}
                    className="text-rr-dim"
                  />

                  <div
                    className="
                      mt-3
                      text-sm
                      font-medium
                      text-rr-muted
                    "
                  >
                    No audit events yet
                  </div>

                  <p
                    className="
                      mt-1
                      max-w-sm
                      text-xs
                      leading-5
                      text-rr-dim
                    "
                  >
                    Recovery events will appear here after
                    the recovery pipeline records an outcome.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      loadAudit(true)
                    }
                    className="
                      mt-4

                      inline-flex
                      items-center
                      gap-2

                      rounded-lg

                      border
                      border-rr-border

                      px-3
                      py-2

                      text-xs
                      text-rr-muted

                      transition

                      hover:border-rr-gold/40
                      hover:text-rr-text
                    "
                  >

                    <RefreshCw size={13} />

                    Refresh

                  </button>

                </div>

              )}

            </div>


            {/* =================================================
                SCROLL HINT
            ================================================== */}

            {rows.length > 0 && (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3

                  border-t
                  border-rr-border/50

                  bg-rr-bg

                  px-4
                  py-2.5

                  text-[10px]
                  text-rr-dim
                "
              >

                <span>
                  Scroll inside the table to view all audit fields.
                </span>

                <span className="hidden sm:block">
                  Horizontal + vertical scrolling
                </span>

              </div>
            )}

          </section>

        </div>

      </div>
    </>
  );
}