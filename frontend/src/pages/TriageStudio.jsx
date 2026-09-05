import { useEffect, useMemo, useState } from 'react';

import {
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Volume2,
  WalletCards,
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { usePageMotion } from '../hooks/usePageMotion';

const LANGUAGES = [
  'Hinglish',
  'Hindi',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Bengali',
  'Kannada',
  'English',
];

export default function TriageStudio() {
  const ref = usePageMotion();

  const [transactions, setTransactions] = useState([]);
  const [transactionId, setTransactionId] = useState('');

  const [language, setLanguage] = useState('Hinglish');

  const [phone, setPhone] = useState('');

  const [simulateQuietHours, setSimulateQuietHours] =
    useState(false);

  const [forceApprove, setForceApprove] =
    useState(false);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [communicationLoading, setCommunicationLoading] =
    useState(false);
  const [voiceLoading, setVoiceLoading] =
    useState(false);

  const [voiceUrl, setVoiceUrl] = useState('');

  const [copied, setCopied] = useState(false);

  /* ==========================================================
     LOAD TRANSACTIONS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const response = await api.transactions();

        const list = response?.transactions ?? [];

        if (cancelled) return;

        setTransactions(list);

        if (list.length > 0) {
          setTransactionId(
            list[0].transaction_id
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error?.message ||
              'Unable to load transactions.'
          );
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     SELECTED TRANSACTION
  ========================================================== */

  const transaction = useMemo(() => {
    return transactions.find(
      (item) =>
        item.transaction_id === transactionId
    );
  }, [transactions, transactionId]);

  /* ==========================================================
     KEEP PHONE IN SYNC WITH SELECTED TRANSACTION
  ========================================================== */

  useEffect(() => {
    if (transaction) {
      setPhone(
        String(transaction.phone || '')
      );
    }
  }, [transaction]);

  /* ==========================================================
     CLEAN AUDIO URL
  ========================================================== */

  useEffect(() => {
    return () => {
      if (voiceUrl) {
        URL.revokeObjectURL(voiceUrl);
      }
    };
  }, [voiceUrl]);

  /* ==========================================================
     RUN RECOVERY PIPELINE
  ========================================================== */

  async function runRecovery() {
    if (!transaction) {
      toast.error(
        'Please select a transaction first.'
      );
      return;
    }

    const cleanPhone = phone.replace(
      /\D/g,
      ''
    );

    if (cleanPhone.length < 10) {
      toast.error(
        'Enter a valid 10-digit phone number.'
      );
      return;
    }

    setLoading(true);
    setResult(null);
    setCopied(false);

    if (voiceUrl) {
      URL.revokeObjectURL(voiceUrl);
      setVoiceUrl('');
    }

    try {
      const transactionPayload = {
        ...transaction,
        phone: cleanPhone.slice(-10),
      };

      const response = await api.triage({
        transaction: transactionPayload,
        targetLanguage: language,
        isSuppressed: false,
        forceDispatch: false,
        forceApprove,
        simulatedHour:
          simulateQuietHours
            ? 23
            : null,
      });

      setResult(response);

      const status =
        response?.status?.toLowerCase() || '';

      if (status.includes('ready')) {
        toast.success(
          'Recovery workflow prepared.'
        );
      } else {
        toast.info(
          'Workflow gate applied.'
        );
      }
    } catch (error) {
      toast.error(
        error?.message ||
          'Recovery pipeline failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     REFRESH CUSTOMER COMMUNICATION
     
     This is used when:
     - language changes
     - phone number changes
     
     It does not rerun the full AI decision graph.
  ========================================================== */

  async function refreshCommunication({
    nextLanguage = language,
    nextPhone = phone,
  } = {}) {
    if (!transaction || !result) {
      return;
    }

    const cleanPhone = String(
      nextPhone || ''
    ).replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      toast.error(
        'Enter a valid 10-digit phone number.'
      );
      return;
    }

    setCommunicationLoading(true);

    try {
      const response =
        await api.communication({
          transaction: {
            ...transaction,
            phone: cleanPhone.slice(-10),
          },

          targetLanguage:
            nextLanguage,

          effectiveAmount:
            Number(
              result.effective_amount ??
                transaction.amount ??
                0
            ),

          decision:
            result.decision || {},

          failureReason:
            result.failure_reason ||
            transaction.failure_reason,

          phone: cleanPhone.slice(-10),
        });

      setResult((previous) => ({
        ...(previous || {}),
        ...response,
      }));

      if (voiceUrl) {
        URL.revokeObjectURL(
          voiceUrl
        );
        setVoiceUrl('');
      }

      toast.success(
        `Communication updated for ${nextLanguage}.`
      );
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to update customer communication.'
      );
    } finally {
      setCommunicationLoading(false);
    }
  }

  /* ==========================================================
     LANGUAGE CHANGE
  ========================================================== */

  async function handleLanguageChange(event) {
    const nextLanguage =
      event.target.value;

    setLanguage(nextLanguage);

    if (result) {
      await refreshCommunication({
        nextLanguage,
        nextPhone: phone,
      });
    }
  }

  /* ==========================================================
     PHONE UPDATE
  ========================================================== */

  async function handlePhoneUpdate() {
    await refreshCommunication({
      nextLanguage: language,
      nextPhone: phone,
    });
  }

  /* ==========================================================
     VOICE
  ========================================================== */

  async function generateVoice() {
    const message =
      result?.spoken_message ||
      result?.final_message ||
      '';

    if (!message.trim()) {
      toast.error(
        'No customer message is available for voice generation.'
      );
      return;
    }

    setVoiceLoading(true);

    try {
      const response = await api.voice({
        text: message,
        target_lang: language,
      });

      if (
        !response?.ok ||
        !response?.audio_base64
      ) {
        throw new Error(
          response?.message ||
            'Voice service did not return audio.'
        );
      }

      const bytes =
        Uint8Array.from(
          atob(response.audio_base64),
          (character) =>
            character.charCodeAt(0)
        );

      const blob = new Blob(
        [bytes],
        {
          type:
            response.mime_type ||
            'audio/mpeg',
        }
      );

      const url =
        URL.createObjectURL(blob);

      setVoiceUrl(
        (previousUrl) => {
          if (previousUrl) {
            URL.revokeObjectURL(
              previousUrl
            );
          }

          return url;
        }
      );

      toast.success(
        `${language} voice note generated.`
      );
    } catch (error) {
      toast.error(
        error?.message ||
          `Unable to generate ${language} voice.`
      );
    } finally {
      setVoiceLoading(false);
    }
  }

  /* ==========================================================
     COPY MESSAGE
  ========================================================== */

  async function copyDraft() {
    const message =
      result?.final_message ||
      result?.spoken_message ||
      '';

    if (!message.trim()) {
      toast.error(
        'No recovery message is available.'
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        message
      );

      setCopied(true);

      toast.success(
        'Recovery message copied.'
      );

      setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      toast.error(
        'Unable to copy message.'
      );
    }
  }

  /* ==========================================================
     STATUS
  ========================================================== */

  function getStatusTone() {
    const status =
      result?.status?.toLowerCase() || '';

    if (
      status.includes('suppressed') ||
      status.includes('blocked') ||
      status.includes('dispute')
    ) {
      return 'danger';
    }

    if (
      status.includes('ready') ||
      status.includes('recovered')
    ) {
      return 'success';
    }

    return 'warning';
  }

  /* ==========================================================
     CUSTOMER MESSAGE
  ========================================================== */

  const customerMessage =
    result?.final_message ||
    result?.spoken_message ||
    '';

  /* ==========================================================
     PAYMENT URL
     
     If the backend has a real Razorpay URL,
     use it.

     If the current fallback is the old fake:
       https://rzp.io/i/TXN_...
     
     use the local functional demo payment page.
  ========================================================== */

  const paymentUrl = useMemo(() => {
    const url =
      result?.retry_url || '';

    if (
      url &&
      !url.includes(
        'rzp.io/i/TXN_'
      )
    ) {
      return url;
    }

    if (
      transaction?.transaction_id
    ) {
      return `${
        window.location.origin
      }/recovery-demo/${
        encodeURIComponent(
          transaction.transaction_id
        )
      }?amount=${
        encodeURIComponent(
          result?.effective_amount ??
            transaction.amount ??
            0
        )
      }&name=${
        encodeURIComponent(
          transaction.name || ''
        )
      }&phone=${
        encodeURIComponent(
          phone
        )
      }`;
    }

    return '';
  }, [
    result?.retry_url,
    result?.effective_amount,
    transaction,
    phone,
  ]);

  /* ==========================================================
     WHATSAPP
  ========================================================== */

  const cleanPhone =
    phone.replace(/\D/g, '');

  const whatsappUrl =
    cleanPhone.length >= 10 &&
    customerMessage
      ? `https://wa.me/91${cleanPhone.slice(
          -10
        )}?text=${encodeURIComponent(
          customerMessage
        )}`
      : '#';

  return (
    <div ref={ref}>
      <SectionHeader
        eyebrow="AI operations"
        title="Single-customer triage studio"
        description="Diagnose gateway errors, choose a bounded intervention, pass safety gates, and preview localized recovery communication."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">

        {/* ====================================================
            LEFT
        ===================================================== */}

        <section className="rr-surface rr-glow rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Bot
              size={17}
              className="text-rr-gold"
            />

            <h2 className="text-sm font-semibold text-rr-text">
              Ingest & diagnose
            </h2>
          </div>

          <div className="mt-5 space-y-4">

            {/* TRANSACTION */}

            <label className="block text-xs text-rr-muted">
              Transaction

              <select
                value={transactionId}
                onChange={(event) =>
                  setTransactionId(
                    event.target.value
                  )
                }
                className="
                  mt-2
                  w-full
                  rounded-xl
                  border
                  border-rr-border
                  bg-rr-bg
                  px-3
                  py-3
                  text-sm
                  text-rr-text
                  outline-none

                  focus:border-rr-gold/60
                "
              >
                {transactions.length === 0 ? (
                  <option value="">
                    No transactions available
                  </option>
                ) : (
                  transactions.map(
                    (item) => (
                      <option
                        key={
                          item.transaction_id
                        }
                        value={
                          item.transaction_id
                        }
                        className="
                          bg-[#14100B]
                          text-[#EBE4D1]
                        "
                      >
                        {
                          item.transaction_id
                        }{' '}
                        —{' '}
                        {item.name} — ₹
                        {
                          item.amount
                        }
                      </option>
                    )
                  )
                )}
              </select>
            </label>

            {/* DETAILS */}

            {transaction && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    'Gateway code',
                    transaction.raw_gateway_error,
                  ],
                  [
                    'Root cause',
                    transaction.failure_reason,
                  ],
                  [
                    'Category',
                    transaction.category,
                  ],
                  [
                    'Attempts',
                    transaction.attempt_number,
                  ],
                  [
                    'Aging',
                    `${transaction.days_overdue} days`,
                  ],
                  [
                    'Gross margin',
                    `${Math.round(
                      Number(
                        transaction.gross_margin ||
                          0
                      ) * 100
                    )}%`,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="
                        rounded-xl
                        border
                        border-rr-border/55
                        bg-rr-bg
                        p-3
                      "
                    >
                      <div className="text-[11px] uppercase tracking-wider text-rr-dim">
                        {label}
                      </div>

                      <div className="mt-1 break-words text-sm text-rr-text">
                        {value ?? '—'}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* LANGUAGE / PHONE */}

            <div className="grid gap-3 sm:grid-cols-2">

              {/* LANGUAGE */}

              <label className="block text-xs text-rr-muted">
                Target language

                <select
                  value={language}
                  onChange={
                    handleLanguageChange
                  }
                  disabled={
                    communicationLoading
                  }
                  className="
                    mt-2
                    w-full
                    rounded-xl
                    border
                    border-rr-border
                    bg-rr-bg
                    px-3
                    py-3
                    text-sm
                    text-rr-text
                    outline-none

                    focus:border-rr-gold/60

                    disabled:opacity-60
                  "
                >
                  {LANGUAGES.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                        className="
                          bg-[#14100B]
                          text-[#EBE4D1]
                        "
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* PHONE */}

              <label className="block text-xs text-rr-muted">
                Phone

                <div className="mt-2 flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    className="
                      min-w-0
                      flex-1
                      rounded-xl
                      border
                      border-rr-border
                      bg-rr-bg
                      px-3
                      py-3
                      text-sm
                      text-rr-text
                      outline-none

                      focus:border-rr-gold/60
                    "
                  />

                  {result && (
                    <button
                      type="button"
                      onClick={
                        handlePhoneUpdate
                      }
                      disabled={
                        communicationLoading
                      }
                      title="Update phone and payment link"
                      className="
                        shrink-0
                        rounded-xl
                        border
                        border-rr-border
                        bg-rr-bg
                        px-3

                        text-rr-gold

                        transition

                        hover:border-rr-gold/40
                        hover:bg-rr-gold/[0.05]

                        disabled:opacity-50
                      "
                    >
                      {communicationLoading ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <RefreshCw
                          size={15}
                        />
                      )}
                    </button>
                  )}
                </div>

                <div className="mt-1 text-[10px] text-rr-dim">
                  The selected transaction number
                  is used initially. You can edit it.
                </div>
              </label>
            </div>

            {/* SAFETY */}

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-rr-muted">
                <input
                  type="checkbox"
                  checked={
                    simulateQuietHours
                  }
                  onChange={(event) =>
                    setSimulateQuietHours(
                      event.target.checked
                    )
                  }
                  className="accent-[#D9A353]"
                />

                Simulate quiet hours
              </label>

              <label className="flex items-center gap-2 text-xs text-rr-muted">
                <input
                  type="checkbox"
                  checked={forceApprove}
                  onChange={(event) =>
                    setForceApprove(
                      event.target.checked
                    )
                  }
                  className="accent-[#D9A353]"
                />

                Force approve HITL
              </label>
            </div>

            {/* RUN */}

            <button
              type="button"
              onClick={runRecovery}
              disabled={
                loading ||
                !transaction
              }
              className="
                flex
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

                transition-all
                duration-300

                hover:bg-rr-goldBright

                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                  Running recovery graph…
                </>
              ) : (
                'Run recovery pipeline'
              )}
            </button>
          </div>
        </section>

        {/* ====================================================
            RIGHT
        ===================================================== */}

        <section className="rr-surface rr-glow rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert
              size={17}
              className="text-rr-gold"
            />

            <h2 className="text-sm font-semibold text-rr-text">
              Decision & customer communication
            </h2>
          </div>

          {!result ? (
            <div className="grid min-h-[360px] place-items-center px-4 text-center text-sm text-rr-dim">
              Run the workflow to inspect the decision,
              localized message, voice and payment QR.
            </div>
          ) : (
            <div className="mt-5 space-y-4">

              {/* STATUS */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge
                  tone={getStatusTone()}
                >
                  {result.status ||
                    'Workflow completed'}
                </StatusBadge>

                <span className="text-xs text-rr-dim">
                  Confidence{' '}
                  {result.confidence ??
                    0}
                  %
                </span>
              </div>

              {/* DECISION */}

              <div className="rounded-xl border border-rr-border/70 bg-rr-bg p-4">
                <div className="text-xs uppercase tracking-wider text-rr-dim">
                  Prescribed intervention
                </div>

                <div className="mt-2 text-sm font-medium text-rr-text">
                  {result.decision
                    ?.action ||
                    'No intervention specified'}
                </div>

                <p className="mt-2 text-xs leading-5 text-rr-muted">
                  {result.decision
                    ?.explanation ||
                    'No additional explanation was returned.'}
                </p>
              </div>

              {/* AMOUNT / DISPATCH */}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rr-border/70 bg-rr-bg p-4">
                  <div className="flex items-center gap-2 text-xs text-rr-muted">
                    <WalletCards size={14} />
                    Effective amount
                  </div>

                  <div className="mt-2 text-lg font-semibold text-rr-text">
                    ₹
                    {Number(
                      result.effective_amount ??
                        transaction?.amount ??
                        0
                    ).toLocaleString(
                      'en-IN'
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-rr-border/70 bg-rr-bg p-4">
                  <div className="flex items-center gap-2 text-xs text-rr-muted">
                    <Clock3 size={14} />
                    Dispatch
                  </div>

                  <div className="mt-2 text-sm font-medium text-rr-text">
                    {result.decision
                      ?.dispatch_timing ||
                      'Not dispatched'}
                  </div>
                </div>
              </div>

              {/* COMMUNICATION */}

              <div className="rounded-xl border border-rr-gold/20 bg-rr-gold/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-rr-goldBright">
                    Customer communication
                  </div>

                  {communicationLoading && (
                    <div className="flex items-center gap-2 text-[11px] text-rr-muted">
                      <RefreshCw
                        size={12}
                        className="animate-spin"
                      />
                      Updating communication…
                    </div>
                  )}
                </div>

                {/* MESSAGE */}

                <div className="mt-4">
                  <div className="text-[11px] text-rr-dim">
                    WhatsApp preview
                  </div>

                  <div className="mt-2 rounded-xl border border-rr-border/70 bg-rr-bg p-3">
                    <p className="text-sm leading-6 text-rr-text">
                      {customerMessage ||
                        'No customer-facing message has been generated.'}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

                  {/* VOICE */}

                  <button
                    type="button"
                    onClick={
                      generateVoice
                    }
                    disabled={
                      voiceLoading ||
                      !customerMessage
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2

                      rounded-lg
                      border
                      border-rr-border
                      bg-rr-bg

                      px-3
                      py-2.5

                      text-xs
                      text-rr-text

                      transition

                      hover:border-rr-gold/40
                      hover:bg-rr-gold/[0.05]

                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {voiceLoading ? (
                      <RefreshCw
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Volume2
                        size={14}
                      />
                    )}

                    {voiceLoading
                      ? 'Generating…'
                      : `Generate ${language} voice`}
                  </button>

                  {/* COPY */}

                  <button
                    type="button"
                    onClick={
                      copyDraft
                    }
                    disabled={
                      !customerMessage
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2

                      rounded-lg
                      border
                      border-rr-border
                      bg-rr-bg

                      px-3
                      py-2.5

                      text-xs
                      text-rr-text

                      transition

                      hover:border-rr-gold/40
                      hover:bg-rr-gold/[0.05]

                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    <Copy size={14} />

                    {copied
                      ? 'Copied'
                      : 'Copy draft'}
                  </button>

                  {/* WHATSAPP */}

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => {
                      if (
                        cleanPhone.length <
                          10 ||
                        !customerMessage
                      ) {
                        event.preventDefault();

                        toast.error(
                          'Enter a valid phone number and generate a message first.'
                        );
                      }
                    }}
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2

                      rounded-lg
                      border
                      border-rr-border
                      bg-rr-bg

                      px-3
                      py-2.5

                      text-xs
                      text-rr-text

                      transition

                      hover:border-rr-gold/40
                      hover:bg-rr-gold/[0.05]
                    "
                  >
                    <MessageCircle
                      size={14}
                    />

                    WhatsApp draft
                  </a>

                  {/* PAYMENT LINK */}

                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        inline-flex
                        items-center
                        justify-center
                        gap-2

                        rounded-lg
                        border
                        border-rr-border
                        bg-rr-bg

                        px-3
                        py-2.5

                        text-xs
                        text-rr-text

                        transition

                        hover:border-rr-gold/40
                        hover:bg-rr-gold/[0.05]
                      "
                    >
                      Payment page
                      <ExternalLink
                        size={14}
                      />
                    </a>
                  )}
                </div>

                {/* AUDIO */}

                {voiceUrl && (
                  <div className="mt-4 rounded-xl border border-rr-border bg-rr-bg p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-rr-muted">
                      <Volume2
                        size={14}
                        className="text-rr-gold"
                      />

                      {language} regional voice
                    </div>

                    <audio
                      controls
                      preload="metadata"
                      src={voiceUrl}
                      className="w-full"
                    />
                  </div>
                )}

                {/* QR */}

                {paymentUrl ? (
                  <div className="mt-4 rounded-xl border border-rr-border bg-rr-bg p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <QrCode
                        size={16}
                        className="text-rr-gold"
                      />

                      <div>
                        <div className="text-sm font-medium text-rr-text">
                          Recovery payment QR
                        </div>

                        <div className="text-[11px] text-rr-dim">
                          Scan to open the recovery payment page.
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 rounded-xl border border-rr-border/70 bg-[#0E0B08] p-4 sm:flex-row">
                      <div className="shrink-0 rounded-2xl bg-white p-3 shadow-[0_0_30px_rgba(217,163,83,0.08)]">
                        <QRCodeSVG
                          value={
                            paymentUrl
                          }
                          size={132}
                          bgColor="#FFFFFF"
                          fgColor="#111111"
                          level="M"
                          includeMargin
                        />
                      </div>

                      <div className="min-w-0 text-center sm:text-left">
                        <div className="text-sm font-medium text-rr-text">
                          Scan to recover payment
                        </div>

                        <p className="mt-1 break-words text-xs leading-5 text-rr-muted">
                          The QR opens the
                          same payment page
                          used by the button.
                        </p>

                        <a
                          href={
                            paymentUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-rr-gold hover:text-rr-goldBright"
                        >
                          Open payment page
                          <ExternalLink
                            size={12}
                          />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-rr-border bg-rr-bg p-4">
                    <div className="flex items-center gap-2 text-xs text-rr-dim">
                      <QrCode
                        size={15}
                      />
                      Payment URL unavailable.
                    </div>
                  </div>
                )}
              </div>

              {customerMessage && (
                <div className="flex items-center gap-2 text-xs text-rr-success">
                  <CheckCircle2
                    size={15}
                  />
                  Customer communication is ready.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}