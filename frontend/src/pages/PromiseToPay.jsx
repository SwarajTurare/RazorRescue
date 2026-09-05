import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { api } from "../services/api";
import { toast } from "react-toastify";
import SectionHeader from "../components/ui/SectionHeader";
import StatusBadge from "../components/ui/StatusBadge";
const scenarios = [
  "Mere account se ₹1,499 kat gaya hai! Bar bar message mat bhejo!",
  "Check karo, payment ho gaya hai UTR number 428901829102",
  "Abhi balance nahi hai, 1st tarikh ko salary ke baad pay karunga",
];
export default function PromiseToPay() {
  const [txns, setTxns] = useState([]),
    [id, setId] = useState(""),
    [text, setText] = useState(scenarios[0]),
    [out, setOut] = useState(null);
  useEffect(() => {
    api
      .transactions()
      .then((r) => {
        setTxns(r.transactions || []);
        if (r.transactions?.[0]) setId(r.transactions[0].transaction_id);
      })
      .catch((e) => toast.error(e.message));
  }, []);
  const analyze = async () => {
    try {
      const r = await api.analyzePtp({ transactionId: id, text });
      setOut(r);
      toast.success("Inbound message analyzed");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div>
      <SectionHeader
        eyebrow="Customer communication"
        title="Promise-to-pay & dispute loop"
        description="Interpret inbound customer replies, stop inappropriate recovery, detect UTR references, and pause nudges around explicit commitments."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
        <section className="rr-surface rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText size={17} className="text-[#D9A353]" /> Inbound
            WhatsApp simulator
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-xs text-[#AF9F7E]">
              Account
              <select
                className="mt-2 w-full rounded-xl border border-[#463A31] bg-[#14100B] p-3 text-sm"
                value={id}
                onChange={(e) => setId(e.target.value)}
              >
                {txns.map((t) => (
                  <option key={t.transaction_id} value={t.transaction_id}>
                    {t.transaction_id} — {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setText(s)}
                  className="rounded-lg border border-[#463A31]/70 bg-[#14100B] px-3 py-2 text-xs text-[#AF9F7E] hover:text-[#EBE4D1]"
                >
                  Scenario {String.fromCharCode(65 + i)}
                </button>
              ))}
            </div>
            <textarea
              rows="5"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none rounded-xl border border-[#463A31] bg-[#14100B] p-3 text-sm leading-6 outline-none"
            />
            <button
              onClick={analyze}
              className="w-full rounded-xl bg-[#EBE4D1] px-4 py-3 text-sm font-semibold text-[#0E0B08]"
            >
              Analyze inbound event
            </button>
          </div>
        </section>
        <section className="rr-surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold">
            Real-time commitment & dispute ledger
          </h2>
          {!out ? (
            <div className="grid min-h-[330px] place-items-center text-center text-sm text-[#756A57]">
              No inbound event analyzed yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge
                  tone={out.result.is_dispute ? "warning" : "success"}
                >
                  {out.result.status}
                </StatusBadge>
                {out.result.sentiment && (
                  <span className="text-xs text-[#756A57]">
                    Sentiment: {out.result.sentiment}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-[#463A31]/70 bg-[#14100B] p-4">
                <div className="text-xs uppercase tracking-wider text-[#756A57]">
                  Agent interpretation
                </div>
                <p className="mt-2 text-sm leading-6 text-[#EBE4D1]">
                  {out.result.bot_response ||
                    (out.result.has_commitment
                      ? `Recovery nudges paused until ${out.result.promised_date_description}.`
                      : "Normal recovery flow may proceed.")}
                </p>
              </div>
              {out.result.utr_number && (
                <div className="rounded-xl border border-[#D9A353]/15 bg-[#D9A353]/[.05] p-4">
                  <div className="text-xs text-[#E7B96A]">
                    UTR reconciliation pending
                  </div>
                  <div className="mt-1 font-mono text-lg">
                    {out.result.utr_number}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
