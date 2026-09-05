import { useEffect, useState } from 'react';

import {
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
  Phone,
  MessageSquareText,
  CheckCircle2,
  AlertTriangle,
  Ban,
} from 'lucide-react';

import { api } from '../services/api';
import { toast } from 'react-toastify';

import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';


const DEFAULT_PHONE = '9876543210';


export default function Compliance() {
  const [text, setText] = useState('');
  const [phone, setPhone] = useState(DEFAULT_PHONE);

  const [result, setResult] = useState(null);
  const [list, setList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  /* ============================================================
     LOAD SUPPRESSION LIST
  ============================================================ */

  const loadSuppressionList = async (showToast = false) => {
    try {
      setRefreshing(true);

      const response = await api.suppressionList();

      const numbers = Array.isArray(response?.numbers)
        ? response.numbers
        : [];

      setList(numbers);

      if (showToast) {
        toast.success('Suppression registry refreshed');
      }
    } catch (error) {
      console.error('Suppression list error:', error);

      setList([]);

      toast.error(
        error?.message ||
        'Unable to load suppression registry'
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };


  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadSuppressionList();
  }, []);


  /* ============================================================
     EVALUATE COMPLIANCE
  ============================================================ */

  const evaluateCompliance = async () => {
    const message = text.trim();
    const normalizedPhone = phone
      .replace(/\D/g, '')
      .slice(-10);


    if (!message) {
      toast.warning(
        'Enter an inbound customer message first'
      );
      return;
    }


    if (normalizedPhone.length !== 10) {
      toast.warning(
        'Enter a valid 10-digit phone number'
      );
      return;
    }


    try {
      setEvaluating(true);
      setResult(null);


      /* ----------------------------------------------
         Ask AI service to evaluate stop rules
      ---------------------------------------------- */

      const response = await api.compliance({
        text: message,
      });


      const complianceResult = {
        is_opt_out:
          Boolean(response?.is_opt_out),

        reason:
          response?.reason ||
          'No compliance rule information returned.',
      };


      setResult(complianceResult);


      /* ----------------------------------------------
         If opt-out detected, persist suppression
      ---------------------------------------------- */

      if (complianceResult.is_opt_out) {
        try {
          await api.suppress({
            phone: normalizedPhone,
            reason: complianceResult.reason,
          });

          await loadSuppressionList();

          toast.warning(
            'STOP rule triggered. Customer added to suppression registry.'
          );
        } catch (suppressionError) {
          console.error(
            'Suppression error:',
            suppressionError
          );

          toast.error(
            suppressionError?.message ||
            'Rule detected, but suppression could not be saved.'
          );
        }
      } else {
        toast.success(
          'No opt-out rule triggered'
        );
      }
    } catch (error) {
      console.error(
        'Compliance evaluation error:',
        error
      );

      toast.error(
        error?.message ||
        'Compliance evaluation failed'
      );
    } finally {
      setEvaluating(false);
    }
  };


  /* ============================================================
     CLEAR FORM
  ============================================================ */

  const clearEvaluation = () => {
    setText('');
    setResult(null);
  };


  return (
    <div className="w-full">
      <SectionHeader
        eyebrow="Trust & safety"
        title="Compliance control center"
        description="Honor opt-outs, protect quiet hours, and make suppression a first-class recovery guardrail."
      />


      {/* ======================================================
          MAIN GRID
      ======================================================= */}

      <div
        className="
          grid
          w-full
          gap-4

          lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]
        "
      >


        {/* ====================================================
            EVALUATION PANEL
        ===================================================== */}

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
              <ShieldCheck
                size={18}
                className="text-rr-gold"
              />

              <h2
                className="
                  text-sm
                  font-semibold
                  text-rr-text
                "
              >
                Evaluate inbound stop rules
              </h2>
            </div>


            {result && (
              <button
                type="button"
                onClick={clearEvaluation}
                className="
                  rounded-lg
                  border
                  border-rr-border

                  px-3
                  py-1.5

                  text-xs
                  text-rr-muted

                  transition

                  hover:border-rr-gold/40
                  hover:text-rr-text
                "
              >
                Clear
              </button>
            )}

          </div>


          <div className="mt-6 space-y-4">


            {/* =================================================
                CUSTOMER MESSAGE
            ================================================== */}

            <div>
              <label
                className="
                  flex
                  items-center
                  gap-2

                  text-xs
                  font-medium
                  text-rr-muted
                "
              >
                <MessageSquareText
                  size={14}
                  className="text-rr-gold"
                />

                Customer message
              </label>


              <textarea
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                rows={5}
                placeholder="e.g. band karo, stop messaging me, don't contact me again"
                className="
                  mt-2
                  w-full
                  resize-y

                  rounded-xl
                  border
                  border-rr-border

                  bg-rr-bg

                  p-3

                  text-sm
                  leading-6
                  text-rr-text

                  outline-none

                  placeholder:text-rr-dim

                  transition

                  focus:border-rr-gold/50
                  focus:ring-1
                  focus:ring-rr-gold/20
                "
              />

              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-rr-dim
                "
              >
                The message is checked for explicit or conversational opt-out intent.
              </p>
            </div>


            {/* =================================================
                PHONE
            ================================================== */}

            <div>
              <label
                className="
                  flex
                  items-center
                  gap-2

                  text-xs
                  font-medium
                  text-rr-muted
                "
              >
                <Phone
                  size={14}
                  className="text-rr-gold"
                />

                Associated phone number
              </label>


              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10);

                  setPhone(value);
                }}
                placeholder="10-digit phone number"
                className="
                  mt-2
                  w-full

                  rounded-xl
                  border
                  border-rr-border

                  bg-rr-bg

                  p-3

                  text-sm
                  text-rr-text

                  outline-none

                  placeholder:text-rr-dim

                  transition

                  focus:border-rr-gold/50
                  focus:ring-1
                  focus:ring-rr-gold/20
                "
              />

              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-rr-dim
                "
              >
                Default number is loaded, but you can replace it with any customer number.
              </p>
            </div>


            {/* =================================================
                ACTION
            ================================================== */}

            <button
              type="button"
              onClick={evaluateCompliance}
              disabled={
                evaluating ||
                !text.trim() ||
                phone.length !== 10
              }
              className="
                inline-flex
                w-full
                items-center
                justify-center
                gap-2

                rounded-xl

                bg-rr-gold

                px-4
                py-3

                text-sm
                font-semibold
                text-rr-bg

                shadow-[0_8px_30px_rgba(217,163,83,.10)]

                transition-all

                hover:-translate-y-0.5
                hover:bg-rr-goldBright

                disabled:cursor-not-allowed
                disabled:opacity-50
                disabled:hover:translate-y-0
              "
            >
              {evaluating ? (
                <>
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />

                  Evaluating...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />

                  Evaluate compliance
                </>
              )}
            </button>


            {/* =================================================
                RESULT
            ================================================== */}

            {result && (
              <div
                className={`
                  rounded-2xl
                  border
                  p-4

                  ${
                    result.is_opt_out
                      ? 'border-red-400/20 bg-red-500/[.04]'
                      : 'border-green-400/20 bg-green-500/[.04]'
                  }
                `}
              >

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                  "
                >

                  <div className="flex items-center gap-2">

                    {result.is_opt_out ? (
                      <Ban
                        size={18}
                        className="text-red-300"
                      />
                    ) : (
                      <CheckCircle2
                        size={18}
                        className="text-green-300"
                      />
                    )}

                    <StatusBadge
                      tone={
                        result.is_opt_out
                          ? 'danger'
                          : 'success'
                      }
                    >
                      {result.is_opt_out
                        ? 'STOP RULE TRIGGERED'
                        : 'NORMAL RESPONSE'}
                    </StatusBadge>

                  </div>


                  <span
                    className="
                      text-[11px]
                      text-rr-dim
                    "
                  >
                    Compliance engine result
                  </span>

                </div>


                <div className="mt-4">

                  <div
                    className="
                      text-[11px]
                      uppercase
                      tracking-[.12em]
                      text-rr-dim
                    "
                  >
                    Reason
                  </div>

                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-rr-muted
                    "
                  >
                    {result.reason}
                  </p>

                </div>


                {result.is_opt_out && (
                  <div
                    className="
                      mt-4
                      flex
                      items-start
                      gap-3

                      rounded-xl

                      border
                      border-rr-gold/15

                      bg-rr-gold/[.04]

                      p-3
                    "
                  >
                    <ShieldAlert
                      size={16}
                      className="
                        mt-0.5
                        shrink-0
                        text-rr-gold
                      "
                    />

                    <div>
                      <div
                        className="
                          text-xs
                          font-semibold
                          text-rr-text
                        "
                      >
                        Recovery blocked for this customer
                      </div>

                      <div
                        className="
                          mt-1
                          text-[11px]
                          leading-5
                          text-rr-dim
                        "
                      >
                        The number has been added to the persistent do-not-contact registry.
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </section>


        {/* ====================================================
            SUPPRESSION REGISTRY
        ===================================================== */}

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

          <div
            className="
              flex
              items-start
              justify-between
              gap-3
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
                <ShieldAlert
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
                  Do-not-contact registry
                </h2>
              </div>

              <p
                className="
                  mt-1
                  text-xs
                  text-rr-dim
                "
              >
                Persistent suppression records stored in SQLite.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                loadSuppressionList(true)
              }
              disabled={refreshing}
              className="
                inline-flex
                shrink-0
                items-center
                gap-2

                rounded-lg
                border
                border-rr-border

                px-2.5
                py-2

                text-xs
                text-rr-muted

                transition

                hover:border-rr-gold/40
                hover:text-rr-text

                disabled:opacity-50
              "
              title="Refresh suppression registry"
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

          </div>


          {/* Registry */}

          <div className="mt-5">

            {loading ? (
              <div
                className="
                  flex
                  min-h-[240px]
                  items-center
                  justify-center

                  rounded-xl
                  border
                  border-rr-border

                  bg-rr-bg

                  text-xs
                  text-rr-dim
                "
              >
                <div className="flex items-center gap-2">
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />

                  Loading suppression registry...
                </div>
              </div>
            ) : list.length > 0 ? (
              <div
                className="
                  max-h-[520px]
                  space-y-2
                  overflow-auto
                  pr-1
                "
              >

                {list.map((number, index) => (
                  <div
                    key={`${number}-${index}`}
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-3

                      rounded-xl

                      border
                      border-rr-border/70

                      bg-rr-bg

                      px-3
                      py-3
                    "
                  >

                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2
                      "
                    >
                      <Phone
                        size={14}
                        className="shrink-0 text-rr-gold"
                      />

                      <span
                        className="
                          truncate
                          font-mono
                          text-sm
                          text-rr-text
                        "
                      >
                        {number}
                      </span>
                    </div>


                    <StatusBadge tone="danger">
                      Permanent opt-out
                    </StatusBadge>

                  </div>
                ))}

              </div>
            ) : (
              <div
                className="
                  flex
                  min-h-[240px]
                  flex-col
                  items-center
                  justify-center

                  rounded-xl

                  border
                  border-dashed
                  border-rr-border

                  bg-rr-bg

                  p-6

                  text-center
                "
              >

                <ShieldCheck
                  size={28}
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
                  Registry is empty
                </div>

                <p
                  className="
                    mt-1
                    max-w-xs
                    text-xs
                    leading-5
                    text-rr-dim
                  "
                >
                  When a customer sends an opt-out message,
                  their number will appear here.
                </p>

              </div>
            )}

          </div>


          {/* Footer information */}

          <div
            className="
              mt-4
              flex
              items-start
              gap-2

              rounded-xl

              border
              border-rr-border/50

              bg-rr-gold/[.025]

              p-3
            "
          >

            <AlertTriangle
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
              Suppressed customers should not receive automated
              recovery communication until the suppression is
              explicitly cleared through an authorized workflow.
            </p>

          </div>

        </section>

      </div>
    </div>
  );
}